// middleware.js
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = [
  "/Recruitment/form/",
  "/form-already-submitted",
  "/form-locked-device",
  "/form-link-expired",
  "/unauthorized-form-access",
];

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/AboutUs",
  "/Contact",
  "/employee/login",
  "/forgot-password",
  "/reset-password",
];

const ALLOWED_PATHS = [
  "/dashboard",
  "/employee/dashboard",
  "/hr/dashboard",
  "/admin/dashboard",
  "/settings/profile",
  "/employee/profile",
];

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

async function verifyJWT(token) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    console.error("JWT verification failed:", error.message);
    return null;
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow all public and static paths
  if (
    PUBLIC_PATHS.some((path) => pathname.startsWith(path)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;
  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // No token for protected routes → redirect home
  if (!isPublic && !token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (token) {
    const decoded = await verifyJWT(token);
    if (!decoded) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const role = decoded.role?.toString().toLowerCase() || "";
    const isVerified = decoded.verified === "verified";
    const hasFormSubmitted = !!decoded.form_submitted;

    // Redirect logged-in users away from login pages only
    if (["/login", "/employee/login"].includes(pathname)) {
      const dashboardPath =
        role === "superadmin"
          ? "/dashboard"
          : role === "employee"
          ? "/employee/dashboard"
          : "/dashboard";

      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }

    // Superadmin has full access
    if (role === "superadmin") {
      return NextResponse.next();
    }

    // Allow dashboards, profile management, upload documents, and public pages for authenticated users
    if (
      ALLOWED_PATHS.includes(pathname) ||
      pathname.startsWith("/settings/profile") ||
      pathname.startsWith("/employee/profile") ||
      pathname.startsWith("/employee/upload-documents") ||
      pathname === "/" ||
      pathname === "/AboutUs" ||
      pathname === "/Contact"
    ) {
      return NextResponse.next();
    }

    // For employees: redirect unverified users or those who haven't submitted forms
    if (role === "employee") {
      const needsVerification = !isVerified && !hasFormSubmitted;
      if (needsVerification) {
        return NextResponse.redirect(
          new URL("/employee/dashboard", request.url)
        );
      }
    }

    // For admin/hr: only check verification (they don't need to submit employee forms)
    if (["admin", "hr"].includes(role)) {
      const needsVerification = !isVerified && !hasFormSubmitted;
      if (needsVerification) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
