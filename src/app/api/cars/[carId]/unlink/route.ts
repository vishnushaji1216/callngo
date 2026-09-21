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

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: User ID required' }, { status: 401 });
    }

    const supabase = createAdminServerClient();

    // Unlink vehicle by clearing owner_id, nickname, model, plate, and activated_at
    const { error } = await supabase
      .from('cars')
      .update({
        owner_id: null,
        nickname: null,
        model_number: null,
        plate_number: null,
        activated_at: null
      })
      .eq('id', carId)
      .eq('owner_id', userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('Error unlinking sticker:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
