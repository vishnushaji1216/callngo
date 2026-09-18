import { NextResponse } from 'next/server';
import { fetchMeteredIceServers } from '@/lib/metered';

export async function GET() {
  try {
    const iceServers = await fetchMeteredIceServers();
    return NextResponse.json({ iceServers }, { status: 200 });
  } catch (error) {
    console.error('API /api/turn error:', error);
    return NextResponse.json(
      { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
      { status: 500 }
    );
  }
}
