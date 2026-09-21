import { createRouteHandler } from "@/lib/apiAdapter";
import { debugSessions } from "@/lib/authMiddleware";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    // Call debug function (will log to console)
    debugSessions();
    
    res.status(200).json({ 
      message: "Session debug info logged to console",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Debug sessions error:", error);
    res.status(500).json({ message: "Error debugging sessions" });
  }
}

export const { GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS } = createRouteHandler(handler);
