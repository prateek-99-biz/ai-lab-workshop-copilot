import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

function isRelativePath(url: string): boolean {
  // Only allow relative paths - reject protocol-relative URLs and absolute URLs
  return url.startsWith('/') && !url.startsWith('//') && !url.includes('://');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const rawRedirect = searchParams.get('redirect') || '/admin';
  const redirect = isRelativePath(rawRedirect) ? rawRedirect : '/admin';

  if (code) {
    const supabase = await createServerClient();
    
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(
        new URL('/auth/login?error=auth_failed', request.url)
      );
    }
  }

  return NextResponse.redirect(new URL(redirect, request.url));
}
