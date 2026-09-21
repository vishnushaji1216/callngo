import { NextRequest, NextResponse } from 'next/server';
import { unblockIP } from '@/lib/callLogs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ip } = body;

    if (!ip) {
      return NextResponse.json({ error: 'IP is required' }, { status: 400 });
    }

    await unblockIP(ip);

    return NextResponse.json({
      success: true,
      message: `IP ${ip} has been unblocked.`
    });
  } catch (err: any) {
    console.error('Admin unblock error:', err);
    return NextResponse.json({ error: err.message || 'Failed to unblock IP' }, { status: 500 });
  }
}
