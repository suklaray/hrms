import { NextRequest, NextResponse } from "next/server";
import { SESSION_CONFIG } from "@/lib/sessionConfig";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  

  try {
    // Return session configuration for frontend synchronization
    return NextResponse.json({
      sessionTimeout: SESSION_CONFIG.TIMEOUT,
      jwtExpiry: SESSION_CONFIG.JWT_EXPIRY,
      warningOffset: SESSION_CONFIG.WARNING_OFFSET,
      // Additional helpful info
      warningTime: SESSION_CONFIG.TIMEOUT - SESSION_CONFIG.WARNING_OFFSET,
      countdownDuration: SESSION_CONFIG.WARNING_OFFSET / 1000
    }, { status: 200 });
  } catch (error) {
    console.error("Session config error:", error);
    return NextResponse.json({ message: "Error retrieving session configuration" }, { status: 500 });
  }
}

