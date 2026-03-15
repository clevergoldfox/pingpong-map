import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = ["/auth/login", "/auth/register"]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function middleware(request: NextRequest) {
  // Allow API routes and Next.js internals / static assets
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next()
  }
  if (request.nextUrl.pathname.startsWith("/_next") || request.nextUrl.pathname.includes(".")) {
    return NextResponse.next()
  }

  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get("auth_token")?.value
  if (!token) {
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images.
     * Exclude: _next/static, _next/image, favicon.ico, etc.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp)$).*)",
  ],
}
