import { NextRequest, NextResponse } from 'next/server';
import { createAnonServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createAnonServerClient();

    const { data: cars, error } = await supabase
      .from('cars')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ cars: cars || [] }, { status: 200 });
  } catch (err: any) {
    console.error('Error fetching admin QRs:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { quantity = 1 } = await req.json();
    const count = Math.max(1, Math.min(Number(quantity) || 1, 100)); // Cap between 1 and 100 per batch

    const supabase = createAnonServerClient();

    const newStickers = Array.from({ length: count }).map(() => ({
      id: crypto.randomUUID(),
      owner_id: null,
      nickname: null,
      model_number: null,
      plate_number: null,
      activated_at: null
    }));

    const { data, error } = await supabase
      .from('cars')
      .insert(newStickers)
      .select();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, count: data?.length || 0, stickers: data }, { status: 200 });
  } catch (err: any) {
    console.error('Error generating admin QRs:', err);
    return NextResponse.json({ error: err.message || 'Server error generating QR stickers' }, { status: 500 });
  }
}
