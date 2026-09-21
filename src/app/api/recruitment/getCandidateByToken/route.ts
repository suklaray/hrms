import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { parse } from "cookie";
import { getQueryParams } from "@/lib/routeHelper";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const { token } = await getQueryParams(req, context?.params);

  // Get user session from JWT token
  const cookies = parse(req.headers.get("cookie") || "");
  const userToken = cookies.token;
  const session = userToken ? await getUserFromToken(userToken) : null;

  // Enhanced IP detection with multiple fallbacks
  const getClientIP = () => {
    const forwarded = req.headers.get("x-forwarded-for");
    const realIP = req.headers.get("x-real-ip");
    const clientIP = req.headers.get("x-client-ip");

    if (forwarded) return forwarded.split(',')[0].trim();
    if (realIP) return realIP.trim();
    if (clientIP) return clientIP.trim();
    return 'unknown';
  };

  const ip = getClientIP();
  const userAgent = (req.headers.get("user-agent") || "unknown-browser").slice(0, 200);

  console.log('IP Detection:', {
    ip,
    userAgent: userAgent.slice(0, 50),
    isLocalhost: ip === '::1' || ip === '127.0.0.1',
    headers: Array.from(req.headers.keys())
  });

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  try {
    // First try to find by token
    let candidate = await prisma.candidates.findFirst({
      where: { form_token: token },
    });

    // If not found by token, check if it's a submitted form (token set to null)
    if (!candidate) {
      candidate = await prisma.candidates.findFirst({
        where: {
          form_submitted: true,
          OR: [
            { candidate_id: token }, // fallback for old candidate IDs
            { form_link: { contains: token } } // check if token exists in form_link
          ]
        }
      });

      if (candidate) {
        // Check if this is authorized staff or candidate
        const isStaff = session && (await checkPermission(session, PERMISSION_KEYS.RECRUITMENT_VIEW));
        if (isStaff) {
          return NextResponse.json({ error: "submitted:Form already submitted" }, { status: 403 });
        }

        // For submitted forms, validate device/IP before showing submitted message
        if (candidate.device_info && candidate.ip_address) {
          const sameIp = candidate.ip_address === ip;
          const sameUA = candidate.device_info.startsWith(userAgent.slice(0, 50));
          if (!sameIp || !sameUA) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
          }
        }

        return NextResponse.json({ error: "submitted:Form already submitted" }, { status: 403 });
      }

      return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
    }

    // Check for authorized staff (they can always view)
    const isStaff = session && (await checkPermission(session, PERMISSION_KEYS.RECRUITMENT_VIEW));
    if (isStaff) {
      return NextResponse.json({ ...candidate, isAdmin: true }, { status: 200 });
    }

    if (candidate.form_submitted) {
      return NextResponse.json({ error: "submitted:Form already submitted" }, { status: 403 });
    }

    //  Optional: check token expiry
    if (
      candidate.token_expiry &&
      new Date() > new Date(candidate.token_expiry)
    ) {
      return NextResponse.json({ error: "expired:Form link has expired" }, { status: 403 });
    }

    // First-time access → lock form to this device/IP
    if (!candidate.device_info && !candidate.ip_address) {
      console.log('First-time access - saving device info:', {
        candidateId: candidate.candidate_id,
        ip,
        userAgent: userAgent.slice(0, 50)
      });

      try {
        // Save device info for first-time access (both admin and regular users)
        const updateResult = await prisma.candidates.update({
          where: { candidate_id: candidate.candidate_id },
          data: {
            device_info: userAgent,
            ip_address: ip,
            token_first_used_at: new Date(),
          },
        });

        console.log('Device info saved successfully:', {
          candidateId: candidate.candidate_id,
          savedIP: updateResult.ip_address,
          savedDevice: updateResult.device_info?.slice(0, 50),
          updateSuccess: true
        });

        return NextResponse.json(candidate, { status: 200 });
      } catch (updateError) {
        console.error('Failed to save device info:', updateError);
        // Continue anyway, don't block form access
        return NextResponse.json(candidate, { status: 200 });
      }
    }

    // 🔐 Subsequent accesses: validate same device/IP (only for non-admin users)
    if (!isStaff) {
      const sameIp = candidate.ip_address === ip;
      const sameUA =
        candidate.device_info &&
        candidate.device_info.startsWith(userAgent.slice(0, 50));
      if (!sameIp || !sameUA) {
        return NextResponse.json({
          error: "locked:Form is locked to a different device",
        }, { status: 403 });
      }
    }

    // ✅ All checks passed
    return NextResponse.json(candidate, { status: 200 });
  } catch (error) {
    console.error("Error fetching candidate by token:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
