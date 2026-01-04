import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to public routes (Login, Register, Auth API)
        if (req.nextUrl.pathname.startsWith("/login") || 
            req.nextUrl.pathname.startsWith("/register") ||
            req.nextUrl.pathname.startsWith("/api/auth")) {
          return true
        }

        // Require ADMIN role for admin routes
        if (req.nextUrl.pathname.startsWith("/admin")) {
          return token?.role === "ADMIN"
        }

        // For all other routes in the 'matcher' list below, require login
        return !!token
      },
    },
  }
)

export const config = {
  // ✅ UPDATE: We removed /feed, /confession, and /api/confession from here.
  // Now, the middleware only protects the Admin dashboard and Admin APIs.
  // The Feed and Confession pages are now effectively public.
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
  ],
}