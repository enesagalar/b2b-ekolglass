import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "ekolglass_session";

export function proxy(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/");
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (isAdminRoute && !hasSessionCookie) {
    const loginUrl = new URL("/giris", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
