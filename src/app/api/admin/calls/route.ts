import { NextResponse } from 'next/server';
import { getAllCallLogs, getBlockedIPs } from '@/lib/callLogs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [logs, blockedIps] = await Promise.all([
      getAllCallLogs(100),
      getBlockedIPs()
    ]);

    return NextResponse.json({
      logs,
      blockedIps
    });
  } catch (err: any) {
    console.error('Admin calls error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch call logs' }, { status: 500 });
  }
}
