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

    const { nickname, model_number, plate_number, userId, pendingVehicleId } = await req.json();

    if (!nickname || !plate_number) {
      return NextResponse.json({ error: 'Vehicle Name and License Plate are required' }, { status: 400 });
    }

    const supabase = createAnonServerClient();

    // 1. Check user authentication
    let currentUserId = userId;
    if (!currentUserId) {
      const { data: authData } = await supabase.auth.getUser();
      currentUserId = authData?.user?.id;
    }

    if (!currentUserId) {
      return NextResponse.json({ error: 'You must be logged in to activate a vehicle sticker' }, { status: 401 });
    }

    // 2. Fetch car by ID
    const { data: existingCar, error: fetchError } = await supabase
      .from('cars')
      .select('id, owner_id')
      .eq('id', carId)
      .maybeSingle();

    let resultCar = null;

    if (existingCar) {
      // Check if already activated by someone else
      if (existingCar.owner_id && existingCar.owner_id !== currentUserId) {
        return NextResponse.json(
          { error: 'This vehicle sticker is already registered and activated by another user.' },
          { status: 400 }
        );
      }

      // Update existing unclaimed/owned car
      const { data: updatedCar, error: updateError } = await supabase
        .from('cars')
        .update({
          owner_id: currentUserId,
          nickname,
          model_number: model_number || '',
          plate_number,
          activated_at: new Date().toISOString()
        })
        .eq('id', carId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }
      resultCar = updatedCar;
    } else {
      // Create new car entry with this specific pre-printed carId
      const { data: newCar, error: insertError } = await supabase
        .from('cars')
        .insert({
          id: carId,
          owner_id: currentUserId,
          nickname,
          model_number: model_number || '',
          plate_number,
          activated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }
      resultCar = newCar;
    }

    // If an inactive pending vehicle placeholder was being linked, remove the temporary placeholder record
    if (pendingVehicleId && pendingVehicleId !== carId) {
      await supabase
        .from('cars')
        .delete()
        .eq('id', pendingVehicleId)
        .eq('owner_id', currentUserId);
    }

    return NextResponse.json({ success: true, car: resultCar }, { status: 200 });
  } catch (err: any) {
    console.error('Error claiming vehicle sticker:', err);
    return NextResponse.json({ error: err.message || 'Server error claiming sticker' }, { status: 500 });
  }
}
