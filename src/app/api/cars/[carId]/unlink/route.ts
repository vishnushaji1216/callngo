import { NextRequest, NextResponse } from 'next/server';
import { createAnonServerClient } from '@/lib/supabase/server';

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

    const supabase = createAnonServerClient();

    let currentUserId = userId;
    if (!currentUserId) {
      const { data: authData } = await supabase.auth.getUser();
      currentUserId = authData?.user?.id;
    }

    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Unlink vehicle by clearing owner_id and activated_at
    const { error } = await supabase
      .from('cars')
      .update({
        owner_id: null,
        activated_at: null
      })
      .eq('id', carId)
      .eq('owner_id', currentUserId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('Error unlinking sticker:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
