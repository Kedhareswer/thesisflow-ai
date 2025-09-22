import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Ensure API routes are never indexed by search engines
  if (req.nextUrl.pathname.startsWith('/api')) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  // Prevent indexing/caching of internal docs
  if (req.nextUrl.pathname.startsWith('/docs')) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    res.headers.set('Pragma', 'no-cache')
    res.headers.set('Referrer-Policy', 'no-referrer')
    res.headers.set('X-Content-Type-Options', 'nosniff')
  }
  
  // Check for Supabase session cookie
  const supabaseToken = req.cookies.get('sb-access-token')?.value ||
                       req.cookies.get('supabase-auth-token')?.value ||
                       req.cookies.get('sb-auth-token')?.value
  
  const hasSession = !!supabaseToken

  // Protected routes that require authentication
  const protectedRoutes = [
    "/research-assistant",
    "/ai-tools", 
    "/collaborate",
    "/collaboration",
    "/planner",
    "/writing-assistant",
    "/ai-assistant",
    "/profile",
    "/settings",
    // Sidebar navigation pages
    "/explorer",        // Explorer - research assistant
    "/writer",          // AI Writer
    "/chat-pdf",        // Chat with PDF
    "/topics",          // Find Topics
    "/paraphraser",     // Paraphraser
    "/citations",       // Citation Generator
    "/extract",         // Extract Data
    "/ai-detector"      // AI Detector
  ]

  // Admin routes that require admin role
  const adminRoutes = ["/admin"]

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/login",
    "/signup", 
    "/forgot-password",
    "/reset-password",
    "/unauthorized",
    // Marketing and informational pages
    "/about",
    "/pricing",
    "/features",
    "/contact",
    "/privacy",
    "/terms",
    "/legal",
    "/blog",
    "/docs",
    "/community",
    "/careers",
    "/partners",
    "/affiliates",
    "/changelog",
    "/events"
  ]

  // Boundary-aware route matching function
  const matchesRoute = (pathname: string, route: string): boolean => {
    if (route === "/") {
      // Exact match for root route
      return pathname === "/";
    }
    // For other routes, match exact equality or startsWith(route + "/")
    return pathname === route || pathname.startsWith(route + "/");
  };

  const isProtectedRoute = protectedRoutes.some((route) => matchesRoute(req.nextUrl.pathname, route))
  const isAdminRoute = adminRoutes.some((route) => matchesRoute(req.nextUrl.pathname, route))
  const isPublicRoute = publicRoutes.some((route) => matchesRoute(req.nextUrl.pathname, route))

  // Redirect authenticated users away from auth pages
  if (hasSession && (req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/signup")) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // Allow access to public routes and static assets
  if (isPublicRoute || req.nextUrl.pathname.startsWith('/_next') || req.nextUrl.pathname.startsWith('/api/public')) {
    return res
  }

  // Redirect to login if accessing protected route without session
  if (isProtectedRoute && !hasSession) {
    const redirectUrl = new URL("/login", req.url)
    redirectUrl.searchParams.set("redirectTo", req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // For admin routes, redirect to unauthorized (we'll check admin status client-side)
  if (isAdminRoute && !hasSession) {
    const redirectUrl = new URL("/login", req.url)
    redirectUrl.searchParams.set("redirectTo", req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from auth pages
  if (hasSession && (req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/signup")) {
    const redirectTo = req.nextUrl.searchParams.get("redirectTo") || "/explorer"
    return NextResponse.redirect(new URL(redirectTo, req.url))
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
