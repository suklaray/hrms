// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, JWTPayload } from "jose";

interface CustomJWTPayload extends JWTPayload {
  id?: number | string;
  empid?: string;
  name?: string;
  role?: string;
  roleId?: number | null;
  email?: string;
  verified?: string;
  form_submitted?: boolean;
}

const PUBLIC_PATHS = [
  "/Recruitment/form/",
  "/form-already-submitted",
  "/form-locked-device",
  "/form-link-expired",
  "/unauthorized-form-access",
  "/403",
];

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/AboutUs",
  "/Contact",
  "/forgot-password",
  "/reset-password",
  "/privacy-policy",
  "/terms-of-service",
  "/cookie-policy",
  "/setup/super-admin",
];

const ALLOWED_PATHS = [
  "/dashboard",
  "/settings/profile",
];

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_jwt_secret");

async function verifyJWT(token: string): Promise<CustomJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as CustomJWTPayload;
  } catch (error: any) {
    console.error("JWT verification failed:", error?.message);
    return null;
  }
}

export async function middleware(request: NextRequest) {
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

  // No token for protected routes -> redirect home
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

    // Redirect logged-in users away from login page
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Superadmin has full access
    if (role === "superadmin") {
      return NextResponse.next();
    }

    // Allow dashboards, profile management, upload documents, and public pages for authenticated users
    if (
      ALLOWED_PATHS.includes(pathname) ||
      pathname.startsWith("/settings/profile") ||
      pathname.startsWith("/employee/upload-documents") ||
      pathname === "/" ||
      pathname === "/AboutUs" ||
      pathname === "/Contact"
    ) {
      return NextResponse.next();
    }

    // For admin/hr: check verification
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
