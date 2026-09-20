import { NextRequest, NextResponse } from 'next/server';
import { getMaskedCallStatus } from '@/lib/edesy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ callSid: string }> }
) {
  try {
    const { callSid } = await params;
    if (!callSid) {
      return NextResponse.json({ error: 'callSid is required' }, { status: 400 });
    }

    // Handle demo mode calls
    if (callSid.startsWith('demo-')) {
      const timestamp = parseInt(callSid.replace('demo-', ''), 10) || Date.now();
      const elapsedSeconds = Math.floor((Date.now() - timestamp) / 1000);

      let status = 'initiated';
      if (elapsedSeconds > 2 && elapsedSeconds <= 6) {
        status = 'ringing';
      } else if (elapsedSeconds > 6 && elapsedSeconds <= 9) {
        status = 'answered';
      } else if (elapsedSeconds > 9 && elapsedSeconds < 59) {
        status = 'in-progress';
      } else if (elapsedSeconds >= 59) {
        status = 'completed';
      }

      return NextResponse.json({
        id: callSid,
        status,
        masked_number: '+91 80713 87146',
        duration_sec: Math.min(59, Math.max(0, elapsedSeconds - 9)),
        max_duration_sec: 59,
        demo: true
      });
    }

    // Live Edesy Call Status
    const statusData = await getMaskedCallStatus(callSid);
    return NextResponse.json(statusData, { status: 200 });

  } catch (err: any) {
    console.error('Fetch call status error:', err);
    return NextResponse.json({ error: err.message || 'Status check failed' }, { status: 500 });
  }
}
