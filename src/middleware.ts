import { createServerClient, CookieOptionsWithName } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create Supabase client for middleware (uses request cookies directly)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieOptionsWithName[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, {
              httpOnly: options.httpOnly ?? true,
              secure: options.secure ?? process.env.NODE_ENV === 'production',
              sameSite: (options.sameSite ?? 'lax') as 'lax' | 'strict' | 'none',
              path: options.path ?? '/',
              domain: options.domain,
              maxAge: options.maxAge,
            })
          })
        },
      },
    }
  )

  // Refresh session - this also sets the auth cookies if needed
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
  }

  // Protect API routes that need auth
  if (
    request.nextUrl.pathname.startsWith('/api/decisions') ||
    request.nextUrl.pathname.startsWith('/api/teams')
  ) {
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Pass user ID to API routes via header
    response.headers.set('x-user-id', user.id)
    response.headers.set('x-user-email', user.email ?? '')
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - auth pages (login, register)
     * - landing page
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|/auth/|/$|/api/ai).*)',
  ],
}
