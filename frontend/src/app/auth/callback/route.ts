import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/api'; // Or your server-side Supabase client if you are using @supabase/ssr

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/'; // Default redirect to dashboard

  if (code) {
    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page or login if the exchange fails
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}