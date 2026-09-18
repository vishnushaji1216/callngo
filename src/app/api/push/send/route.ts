import { NextRequest, NextResponse } from 'next/server';
import { createAdminServerClient } from '@/lib/supabase/server';
import { webpush } from '@/lib/vapid';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { carId, callId } = body;

    if (!carId || !callId) {
      return NextResponse.json(
        { error: 'carId and callId are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminServerClient();

    // 1. Fetch car details safely
    const { data: car, error: carError } = await supabase
      .from('cars')
      .select('id, owner_id, nickname')
      .eq('id', carId)
      .single();

    if (carError || !car) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 });
    }

    // 2. Fetch owner's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('owner_id', car.owner_id);

    if (subError) {
      console.error('Error fetching push subscriptions:', subError);
      return NextResponse.json({ error: 'Failed to fetch owner push subscriptions' }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { message: 'Owner has no active push subscriptions', sent: 0 },
        { status: 200 }
      );
    }

    // 3. Prepare payload according to exact spec:
    // Title: Someone is near your <nickname>
    // Body: Tap to answer
    const payload = JSON.stringify({
      title: `Someone is near your ${car.nickname || 'Blue Swift'}`,
      body: 'Tap to answer',
      callId: callId,
      carId: carId
    });

    // 4. Send push to all registered devices of the owner
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
        console.error('Failed to send push notification to subscription:', sub.endpoint, err);
        // If subscription is expired or invalid (410/404), clean it up from DB
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    });

    await Promise.all(pushPromises);

    return NextResponse.json({ success: true, sent: sentCount }, { status: 200 });
  } catch (err: any) {
    console.error('Push send endpoint error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
