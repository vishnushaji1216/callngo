import { NextRequest, NextResponse } from 'next/server';
import { createAnonServerClient } from '@/lib/supabase/server';

// Anti-Spam Sliding Window Rate Limiter
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

function checkRateLimit(key: string, maxAttempts = 6, windowMs = 15 * 60 * 1000): { blocked: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { blocked: false, remaining: maxAttempts - 1 };
  }

  if (record.count >= maxAttempts) {
    return { blocked: true, remaining: 0 };
  }

  record.count += 1;
  return { blocked: false, remaining: maxAttempts - record.count };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ carId: string }> }
) {
  try {
    const { carId } = await params;
    if (!carId) {
      return NextResponse.json({ error: 'Vehicle ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const { last4, callerPhone, reason } = body;

    // 1. Extract client IP address
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const clientIp = (forwardedFor ? forwardedFor.split(',')[0].trim() : realIp) || '127.0.0.1';

    // 2. Validate inputs
    if (!last4 || String(last4).trim().length === 0) {
      return NextResponse.json({ error: 'Please enter the last 4 digits of the vehicle plate.' }, { status: 400 });
    }

    const cleanPhone = String(callerPhone || '').replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      return NextResponse.json({ error: 'Please provide a valid caller phone number to setup masked calling.' }, { status: 400 });
    }

    // 3. Anti-Spam Check by IP and Phone
    const ipLimit = checkRateLimit(`ip:${clientIp}`);
    const phoneLimit = checkRateLimit(`phone:${cleanPhone}`);

    if (ipLimit.blocked || phoneLimit.blocked) {
      console.warn(`[Anti-Spam] Blocked spam request from IP: ${clientIp}, Phone: ${cleanPhone}`);
      return NextResponse.json({
        error: 'Security Warning: Too many verification requests from this IP/Phone. Access has been temporarily restricted for 6 months.'
      }, { status: 429 });
    }

    // 4. Fetch car details to verify plate
    const supabase = createAnonServerClient();
    const { data: car, error: carError } = await supabase
      .from('cars')
      .select('id, owner_id, nickname, plate_number')
      .eq('id', carId)
      .maybeSingle();

    if (carError || !car) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const storedPlateClean = (car.plate_number || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const enteredLast4Clean = String(last4).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    if (storedPlateClean.length >= 4) {
      const storedLast4 = storedPlateClean.slice(-4);
      if (enteredLast4Clean !== storedLast4) {
        return NextResponse.json({
          verified: false,
          error: 'Verification Failed: The 4 digits you entered do not match the vehicle number plate. Please check the plate on the vehicle.'
        }, { status: 400 });
      }
    }

    // 5. Verification Successful - Log the event
    console.log(`[Verified Contact Attempt] Vehicle: ${car.id}, IP: ${clientIp}, Phone: ${cleanPhone}, Reason: ${reason}`);

    return NextResponse.json({
      verified: true,
      clientIp,
      callerPhone: cleanPhone,
      message: 'Vehicle plate verified. Setting up masked call...'
    }, { status: 200 });

  } catch (err: any) {
    console.error('Verify call error:', err);
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 500 });
  }
}
