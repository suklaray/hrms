import { NextRequest, NextResponse } from "next/server";
import { debugSessions } from "@/lib/authMiddleware";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  

  try {
    // Call debug function (will log to console)
    debugSessions();
    
    return NextResponse.json({ 
      message: "Session debug info logged to console",
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    console.error("Debug sessions error:", error);
    return NextResponse.json({ message: "Error debugging sessions" }, { status: 500 });
  }
}

