import { NextRequest, NextResponse } from "next/server";
import { SESSION_TIMEOUT_MS, JWT_EXPIRY_MS, PROMPT_BEFORE_MS } from "@/lib/sessionConfig";

export async function GET(req: NextRequest) {
  return NextResponse.json({
    sessionTimeout: SESSION_TIMEOUT_MS,
    jwtExpiry: JWT_EXPIRY_MS,
    warningOffset: PROMPT_BEFORE_MS,
    warningTime: SESSION_TIMEOUT_MS - PROMPT_BEFORE_MS,
    countdownDuration: PROMPT_BEFORE_MS / 1000,
  });
}
