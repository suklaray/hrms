import { createRouteHandler } from "@/lib/apiAdapter";
import { withSessionTimeout } from "@/lib/authMiddleware";

function handler(req, res) {
  // User info is already available in req.user from middleware
  return res.status(200).json({ user: req.user, authenticated: true });
}

const wrappedHandler = withSessionTimeout(handler);
export const { GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS } = createRouteHandler(wrappedHandler);
