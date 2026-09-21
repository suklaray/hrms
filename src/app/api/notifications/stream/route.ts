import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { addSSEClient, removeSSEClient, getPendingCount } from "@/lib/notificationEmitter";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") || "";
  const { token } = cookie.parse(cookieHeader);
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let userId: any;
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret");
    userId = decoded.empid || decoded.id;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  const mockRes = {
    write: (data: string) => {
      writer.write(encoder.encode(data)).catch(() => {});
    },
    on: (event: string, cb: any) => {
      if (event === "close") {
        request.signal.addEventListener("abort", cb);
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
    try {
      mockRes.write(`data: ${JSON.stringify({
        id: "heartbeat",
        type: "heartbeat",
        timestamp: new Date().toISOString()
      })}\n\n`);
    } catch {
      clearInterval(heartbeatInterval);
      removeSSEClient(userId);
    }
  }, 30000);

  request.signal.addEventListener("abort", () => {
    clearInterval(heartbeatInterval);
    removeSSEClient(userId);
    writer.close().catch(() => {});
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
