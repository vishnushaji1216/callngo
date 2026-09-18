import { NextRequest, NextResponse } from 'next/server';
import { createAnonServerClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ carId: string }> }
) {
  try {
    const { carId } = await params;
    if (!carId) {
      return NextResponse.json({ error: 'Car ID is required' }, { status: 400 });
    }

    const supabase = createAnonServerClient();

    // Select ONLY id and nickname to guarantee zero owner detail exposure
    const { data: car, error } = await supabase
      .from('cars')
      .select('id, nickname')
      .eq('id', carId)
      .single();

    if (error || !car) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: car.id,
      nickname: car.nickname
    }, { status: 200 });
  } catch (err: any) {
    console.error('Public car fetch error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
