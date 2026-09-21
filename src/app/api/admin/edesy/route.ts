import { NextResponse } from 'next/server';
import { getWalletBalance, getUsageStats } from '@/lib/edesy';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let billing = null;
    let stats = null;
    let billingError = null;
    let statsError = null;

    try {
      billing = await getWalletBalance();
    } catch (err: any) {
      console.warn('Edesy billing error:', err.message);
      billingError = err.message;
    }

    try {
      stats = await getUsageStats();
    } catch (err: any) {
      console.warn('Edesy stats error:', err.message);
      statsError = err.message;
    }

    if (!billing && !stats) {
      return NextResponse.json({
        error: billingError || statsError || 'Failed to fetch Edesy data',
        billing: null,
        stats: null
      }, { status: 502 });
    }

    return NextResponse.json({
      billing,
      stats,
      billingError,
      statsError
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
