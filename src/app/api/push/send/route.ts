import { NextRequest, NextResponse } from 'next/server';
import { createAdminServerClient } from '@/lib/supabase/server';
import { webpush } from '@/lib/vapid';
import { isIPBlocked, saveCallLog } from '@/lib/callLogs';

export async function POST(req: NextRequest) {
  try {
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const clientIp = (forwardedFor ? forwardedFor.split(',')[0].trim() : realIp) || '127.0.0.1';

    if (await isIPBlocked(clientIp)) {
      return NextResponse.json(
        { error: 'Security Notice: This IP address has been temporarily suspended for 30 days due to verified spam reports.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { carId, callId, reason } = body;

    if (!carId || !callId) {
      return NextResponse.json(
        { error: 'carId and callId are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminServerClient();

    // 1. Fetch car details safely if row exists
    const { data: car } = await supabase
      .from('cars')
      .select('id, owner_id, nickname, plate_number')
      .eq('id', carId)
      .maybeSingle();

    const carNickname = car?.nickname || 'Vehicle';
    const carOwnerId = car?.owner_id;

    // 2. Query push subscriptions
    let subscriptions: any[] = [];
    if (carOwnerId) {
      const { data } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('owner_id', carOwnerId);
      subscriptions = data || [];
    }

    // Fallback for test mode or demo car: send to all registered subscriptions if owner query returns empty
    if (subscriptions.length === 0) {
      const { data } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .order('created_at', { ascending: false })
        .limit(10);
      subscriptions = data || [];
    }

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { message: 'No active push subscriptions found on server', sent: 0 },
        { status: 200 }
      );
    }

    // 3. Prepare Push Payload
    const payload = JSON.stringify({
      title: reason ? `🚨 Alert: ${carNickname}` : `Someone is near your ${carNickname}`,
      body: reason ? `${reason} (Tap to respond)` : 'Tap to answer',
      callId: callId,
      carId: carId
    });

    // 4. Send Push Notifications
    let sentCount = 0;
    const pushPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };
      try {
        await webpush.sendNotification(pushSubscription, payload);
        sentCount++;
      } catch (err: any) {
        console.error('Failed to send push notification to endpoint:', sub.endpoint, err);
        // Clean up expired or invalid endpoints (410 Gone / 404 Not Found)
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    });

    await Promise.all(pushPromises);

    // Record inquiry into audit log
    try {
      await saveCallLog({
        car_id: carId,
        owner_id: carOwnerId || null,
        caller_ip: clientIp,
        reason: reason || 'Quick Message Alert',
        call_sid: callId,
        status: 'push_sent',
        car_nickname: carNickname,
        car_plate: car?.plate_number || 'N/A'
      });
    } catch (logErr) {
      console.warn('[Push Send] Could not record into call_logs:', logErr);
    }

    return NextResponse.json({ success: true, sent: sentCount }, { status: 200 });
  } catch (err: any) {
    console.error('Push send endpoint error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
