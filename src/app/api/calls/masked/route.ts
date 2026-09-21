import { NextRequest, NextResponse } from 'next/server';
import { createAdminServerClient } from '@/lib/supabase/server';
import { initiateMaskedCall, normalizeIndianPhone } from '@/lib/edesy';
import { isIPBlocked, saveCallLog } from '@/lib/callLogs';

// Anti-Spam Sliding Window Rate Limiter
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateLimitRecord>();

function checkRateLimit(key: string, maxAttempts = 6, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { blocked: false };
  }

  if (record.count >= maxAttempts) {
    return { blocked: true };
  }

  record.count += 1;
  return { blocked: false };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { carId, callerPhone, last4, reason } = body;

    // 1. Validate inputs
    if (!carId) {
      return NextResponse.json({ error: 'Vehicle ID is required' }, { status: 400 });
    }

    if (!last4 || String(last4).trim().length === 0) {
      return NextResponse.json({ error: 'Please enter the last 4 digits of the vehicle number plate.' }, { status: 400 });
    }

    const cleanCallerPhone = normalizeIndianPhone(callerPhone);
    if (!cleanCallerPhone || cleanCallerPhone.length !== 10) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit mobile number.' }, { status: 400 });
    }

    // 2. Anti-Spam Check by IP and Phone
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const clientIp = (forwardedFor ? forwardedFor.split(',')[0].trim() : realIp) || '127.0.0.1';

    // 2a. Check if IP has an active 30-day spam ban
    if (await isIPBlocked(clientIp)) {
      return NextResponse.json({
        error: 'Security Notice: This IP address has been temporarily suspended for 30 days due to verified spam reports.'
      }, { status: 403 });
    }

    if (checkRateLimit(`ip:${clientIp}`).blocked || checkRateLimit(`phone:${cleanCallerPhone}`).blocked) {
      return NextResponse.json({
        error: 'Too many call attempts. For security, access has been temporarily restricted.'
      }, { status: 429 });
    }

    // 3. Fetch Car from Supabase and Verify Plate
    const supabase = createAdminServerClient();
    const { data: car, error: carError } = await supabase
      .from('cars')
      .select('id, owner_id, nickname, plate_number')
      .eq('id', carId)
      .maybeSingle();

    if (carError || !car) {
      return NextResponse.json({ error: 'Vehicle not found on platform.' }, { status: 404 });
    }

    const storedPlateClean = (car.plate_number || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const enteredLast4Clean = String(last4).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    if (storedPlateClean.length >= 4) {
      const storedLast4 = storedPlateClean.slice(-4);
      if (enteredLast4Clean !== storedLast4) {
        return NextResponse.json({
          error: 'Verification Failed: The 4 digits you entered do not match the vehicle number plate. Please verify physically.'
        }, { status: 400 });
      }
    }

    // 4. Fetch Owner's registered phone number from profiles
    let ownerPhone = '';
    if (car.owner_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone_number, emergency_contact')
        .eq('id', car.owner_id)
        .maybeSingle();

      ownerPhone = profile?.phone_number || profile?.emergency_contact || '';
    }

    const cleanOwnerPhone = normalizeIndianPhone(ownerPhone);

    if (!cleanOwnerPhone || cleanOwnerPhone.length !== 10) {
      return NextResponse.json({
        error: 'The vehicle owner has not registered a valid phone number on their profile yet.'
      }, { status: 400 });
    }

    if (cleanCallerPhone === cleanOwnerPhone) {
      return NextResponse.json({
        error: 'You cannot initiate a call to your own registered phone number.'
      }, { status: 400 });
    }

    // 5. Check if live Edesy API Key is configured
    const apiKey = process.env.EDESY_API_KEY;

    // Helper to log call details and caller IP into database audit trail
    const recordCallLog = async (callSid: string, status: string, isDemo = false) => {
      try {
        await saveCallLog({
          car_id: car.id,
          owner_id: car.owner_id,
          caller_phone: cleanCallerPhone,
          caller_ip: clientIp,
          reason: reason || 'Parking notification',
          call_sid: callSid,
          status: isDemo ? 'demo' : status,
          car_nickname: car.nickname || 'Vehicle',
          car_plate: car.plate_number || 'N/A'
        });
        console.log(`[Audit Log] Recorded caller IP ${clientIp} for car ${car.id}`);
      } catch (logErr) {
        console.warn('[Audit Log] Notice: could not record into call_logs:', logErr);
      }
    };

    if (!apiKey || apiKey === 'vp_YOUR_API_KEY_HERE') {
      // Demo mode preview response when API key is pending
      const demoSid = `demo-${Date.now()}`;
      console.warn('[Edesy Masked Call] EDESY_API_KEY not configured. Simulating masked call.');
      await recordCallLog(demoSid, 'demo', true);

      return NextResponse.json({
        success: true,
        demo: true,
        call_sid: demoSid,
        masked_number: '+91 80713 87146',
        status: 'initiated',
        party_a: cleanCallerPhone,
        party_b: cleanOwnerPhone,
        message: 'Demo mode: Please add EDESY_API_KEY in .env.local to place live telecom calls.'
      }, { status: 200 });
    }

    // 6. Initiate live Edesy masked call bridge
    console.log(`[Edesy Masking] Dialing Party A: ${cleanCallerPhone} -> Bridging Party B: ${cleanOwnerPhone}`);
    const edesyResult = await initiateMaskedCall({
      partyA: cleanCallerPhone,
      partyB: cleanOwnerPhone,
      maxDurationSec: 59 // Automatically hang up at 59 seconds
    });

    // Record caller IP and call status in audit database
    await recordCallLog(edesyResult.call_sid, edesyResult.status || 'initiated');

    return NextResponse.json({
      success: true,
      demo: false,
      call_sid: edesyResult.call_sid,
      masked_number: edesyResult.masked_number,
      status: edesyResult.status || 'initiated',
      message: 'Call initiated! Your phone will ring in a moment. Answer to speak with the owner.'
    }, { status: 200 });

  } catch (err: any) {
    console.error('Masked call error:', err);
    return NextResponse.json({
      error: err.message || 'Failed to initiate masked call'
    }, { status: 500 });
  }
}
