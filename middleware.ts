import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: ({ token }) => Boolean(token),
  },
});

// These are product/application surfaces. Public marketing, pitch, documentation,
// auth and API routes remain outside this matcher.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/my-area/:path*",
    "/live-floods/:path*",
    "/safe-route/:path*",
    "/action-center/:path*",
    "/action/:path*",
    "/command/:path*",
    "/intelligence/:path*",
    "/predict/:path*",
    "/outlook/:path*",
    "/evidence/:path*",
    "/report/:path*",
    "/prove/:path*",
    "/profile/:path*",
    "/drill/:path*",
    "/emergency-pack/:path*",
  ],
};
