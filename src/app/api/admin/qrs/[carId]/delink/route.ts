import { NextRequest, NextResponse } from 'next/server';
import { createAdminServerClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ carId: string }> }
) {
  try {
    const { carId } = await params;
    if (!carId) {
      return NextResponse.json({ error: 'Sticker ID is required' }, { status: 400 });
    }

    const supabase = createAdminServerClient();

    // Reset car entry to unclaimed pool
    const { data, error } = await supabase
      .from('cars')
      .update({
        owner_id: null,
        nickname: null,
        model_number: null,
        plate_number: null,
        activated_at: null
      })
      .eq('id', carId)
      .select();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, car: data?.[0] }, { status: 200 });
  } catch (err: any) {
    console.error('Error admin delinking sticker:', err);
    return NextResponse.json({ error: err.message || 'Server error delinking sticker' }, { status: 500 });
  }
}
