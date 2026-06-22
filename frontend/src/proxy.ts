import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 1. Get the authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Define protected routes
  const isPortalAdmin = pathname.startsWith('/portal-admin')
  const isSubjectAdmin = pathname.startsWith('/subject/admin')

  if (isPortalAdmin || isSubjectAdmin) {
    // 2. Redirect unauthenticated users immediately
    if (!user) {
      return NextResponse.redirect(new URL('/', request.url)) // Or redirect to '/login'
    }

    // 3. Verify Admin Role securely on the server
    const { data: adminData } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!adminData) {
      // User is logged in but not an admin
      return NextResponse.redirect(new URL('/', request.url))
    }

    // 4. Enforce MFA (AAL2) for internal admin routes (like /subject/admin/inbox)
    if (isSubjectAdmin) {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      
      if (aalData?.currentLevel !== 'aal2') {
        // Admin hasn't completed MFA, redirect them to the MFA setup/verify portal
        return NextResponse.redirect(new URL('/portal-admin', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}