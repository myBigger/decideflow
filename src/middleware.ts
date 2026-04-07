import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware — Vercel Edge Runtime
 *
 * ⚠️ 重要说明：
 * Edge Runtime 对 httpOnly cookie 的支持不完整。
 * dashboard 路由的认证保护移到客户端 AuthContext 中处理（dashboard/page.tsx）
 * 这里只做 API 路由的 401 返回（不在这里读取 user，避免 cookie 问题）
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API 路由认证：不在中间件读取 user（Edge Runtime cookie 问题）
  // 改为让 API 路由自己用 createServerClient 验证
  // 只对 /api/* 做响应头标记，告知这些路由需要认证
  if (
    pathname.startsWith('/api/decisions') ||
    pathname.startsWith('/api/teams') ||
    pathname.startsWith('/api/profile') ||
    pathname.startsWith('/api/ai')
  ) {
    // 不在这里 check user，交给各个 API 路由内部 check
    // 但添加请求标记，方便排查
    const response = NextResponse.next({ request: { headers: request.headers } })
    response.headers.set('x-request-path', pathname)
    return response
  }

  // dashboard 路由：不做服务端重定向（Edge Runtime 读不到 Supabase cookie）
  // 改为让客户端 AuthContext + dashboard/page.tsx 的 useEffect 处理跳转
  return NextResponse.next({ request: { headers: request.headers } })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder
     * - auth pages (login, register)
     * - landing page (/)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|/auth/|/$).*)',
  ],
}
