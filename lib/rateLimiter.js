const rateLimitStore = new Map();
export function rateLimiter({ limit = 5, windowMs = 60 * 1000 } = {}) {
  return (req, res) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    const now = Date.now();
    const record = rateLimitStore.get(ip) || { count: 0, time: now };

    if (now - record.time < windowMs) {
      if (record.count >= limit) {
        res.status(429).json({ message: "Too many login attempts. Please try again later." });
        return false;
      }
      record.count += 1;
    } else {
      record.count = 1;
      record.time = now;
    }

    rateLimitStore.set(ip, record);
    return true;
  };
}
