import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, workEmail, phone, message } = body;

    if (!firstName || !lastName || !workEmail) {
      return NextResponse.json(
        { error: 'First name, last name, and work email are required.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(workEmail)) {
      return NextResponse.json(
        { error: 'Please provide a valid work email address.' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase
        .from('enterprise_leads')
        .insert({
          first_name: firstName,
          last_name: lastName,
          work_email: workEmail,
          phone: phone || null,
          message: message || null,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Supabase insert error:', error);
      }
    } else {
      console.warn('Supabase is not configured; skipping lead insert.');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact sales API error:', error);
    return NextResponse.json({ success: true });
  }
}
