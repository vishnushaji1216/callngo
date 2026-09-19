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

    // 1. Fetch car info
    const { data: car, error: carError } = await supabase
      .from('cars')
      .select('id, owner_id, nickname, model_number, plate_number')
      .eq('id', carId)
      .maybeSingle();

    // If car record doesn't exist yet, it is an unassigned pre-printed sticker ID
    if (!car || !car.owner_id) {
      return NextResponse.json({
        id: carId,
        is_activated: false
      }, { status: 200 });
    }

    // 2. Fetch owner emergency & medical profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('emergency_contact, blood_group, health_issues, medications, allergies')
      .eq('id', car.owner_id)
      .maybeSingle();

    return NextResponse.json({
      id: car.id,
      is_activated: true,
      nickname: car.nickname || 'Vehicle',
      model_number: car.model_number || '',
      plate_number: car.plate_number || '',
      emergency_contact: profile?.emergency_contact || '',
      blood_group: profile?.blood_group || '',
      health_issues: profile?.health_issues || '',
      medications: profile?.medications || '',
      allergies: profile?.allergies || ''
    }, { status: 200 });
  } catch (err: any) {
    console.error('Public car fetch error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
