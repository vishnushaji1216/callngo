import { NextRequest, NextResponse } from 'next/server';
import { createAdminServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, ownerId } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid push subscription payload' },
        { status: 400 }
      );
    }

    const supabase = createAdminServerClient();

    // Store or update subscription in push_subscriptions table
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          owner_id: ownerId || null,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: req.headers.get('user-agent') || ''
        },
        { onConflict: 'endpoint' }
      )
      .select();

    if (error) {
      console.error('Database error storing push subscription:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err: any) {
    console.error('Push subscribe endpoint error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
