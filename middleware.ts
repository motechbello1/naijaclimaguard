import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/my-area",
  "/live-floods",
  "/safe-route",
  "/action-center",
  "/action",
  "/command",
  "/intelligence",
  "/predict",
  "/outlook",
  "/evidence",
  "/report",
  "/prove",
  "/profile",
  "/drill",
  "/emergency-pack",
];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (!isProtected(pathname)) return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || "naijaclimaguard-secret-change-in-production",
  });

  if (!token) {
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", `${pathname}${req.nextUrl.search}`);
    const response = NextResponse.redirect(login);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    return response;
  }

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

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
