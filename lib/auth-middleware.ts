import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protected routes that require authentication
  const protectedRoutes = [
    "/workspace",
    "/research-assistant",
    "/ai-tools",
    "/collaborate",
    "/collaboration",
    "/planner",
    "/writing-assistant",
    "/ai-assistant",
  ]

  // Admin routes that require admin role
  const adminRoutes = ["/admin"]

  const isProtectedRoute = protectedRoutes.some((route) => req.nextUrl.pathname.startsWith(route))

  const isAdminRoute = adminRoutes.some((route) => req.nextUrl.pathname.startsWith(route))

  // Redirect to login if accessing protected route without session
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL("/login", req.url)
    redirectUrl.searchParams.set("redirectTo", req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Check admin access
  if (isAdminRoute && session) {
    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", session.user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url))
    }
  }

  // Redirect authenticated users away from auth pages
  if (session && (req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/signup")) {
    const redirectTo = req.nextUrl.searchParams.get("redirectTo") || "/workspace"
    return NextResponse.redirect(new URL(redirectTo, req.url))
  }

  return res
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
