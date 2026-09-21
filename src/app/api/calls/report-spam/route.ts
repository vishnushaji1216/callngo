import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { reportCallSpam } from '@/lib/callLogs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { logId } = body;

    if (!logId) {
      return NextResponse.json({ error: 'Log ID is required' }, { status: 400 });
    }

    const result = await reportCallSpam(logId, user.id);

    let message = 'Call reported as spam. Thank you for helping keep CallNGo safe.';
    if (result.isBlocked) {
      message = `Call reported as spam. This caller's IP has accumulated ${result.spamCount} spam reports in 30 days and has been automatically suspended for 30 days across CallNGo.`;
    }

    return NextResponse.json({
      success: true,
      isBlocked: result.isBlocked,
      spamCount: result.spamCount,
      blockedUntil: result.blockedUntil,
      message
    });
  } catch (err: any) {
    console.error('Error reporting spam:', err);
    return NextResponse.json({ error: err.message || 'Failed to report spam' }, { status: 500 });
  }
}
