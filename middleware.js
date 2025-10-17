// middleware.js
import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const publicPaths = [
    "/Recruitment/form/",
    "/form-already-submitted",
    "/form-locked-device",
    "/form-link-expired",
    "/unauthorized-form-access",
  ];

  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;

  const publicRoutes = [
    "/",
    "/login",
    "/AboutUs",
    "/Contact",
    "/employee/login",
    "/forgot-password",
    "/reset-password",
  ];

  const isPublic = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!isPublic && !token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}
