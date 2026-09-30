import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { addSSEClient, removeSSEClient, getPendingCount } from "@/lib/notificationEmitter";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") || "";
  let cookieToken: string | undefined;
  try {
    cookieToken = cookie.parse(cookieHeader).token;
  } catch {}
  const nextCookieToken = request.cookies.get("token")?.value;
  const searchToken = request.nextUrl.searchParams.get("token") || undefined;
  const authHeader = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  const token = searchToken || nextCookieToken || cookieToken || authHeader;
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  let userId: any;
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret");
    userId = decoded.empid || decoded.id;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  if (!userId) {
    return new Response(JSON.stringify({ error: "Invalid token payload" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  let isClosed = false;

  const mockRes = {
    write: (data: string) => {
      if (isClosed) return;
      writer.write(encoder.encode(data)).catch(() => {
        isClosed = true;
      });
    },
    on: (event: string, cb: any) => {
      if (event === "close") {
        request.signal.addEventListener("abort", () => {
          isClosed = true;
          cb();
        });
      }
    },
  };

  addSSEClient(userId, mockRes);
  const pendingCount = getPendingCount(userId);

  mockRes.write(`data: ${JSON.stringify({
    id: "sse-connected",
    type: "system",
    status: "connected",
    title: "Real-time notifications connected",
    message: `You will now receive instant notifications${pendingCount > 0 ? ` (${pendingCount} pending delivered)` : ""}`,
    timestamp: new Date().toISOString()
  })}\n\n`);

  const heartbeatInterval = setInterval(() => {
    if (isClosed) {
      clearInterval(heartbeatInterval);
      removeSSEClient(userId, mockRes);
      return;
    }
    try {
      mockRes.write(`data: ${JSON.stringify({
        id: "heartbeat",
        type: "heartbeat",
        timestamp: new Date().toISOString()
      })}\n\n`);
    } catch {
      clearInterval(heartbeatInterval);
      removeSSEClient(userId, mockRes);
    }
  }, 25000);

  request.signal.addEventListener("abort", () => {
    isClosed = true;
    clearInterval(heartbeatInterval);
    removeSSEClient(userId, mockRes);
    writer.close().catch(() => {});
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform, no-store, must-revalidate",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
