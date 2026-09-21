// src/lib/rateLimiter.ts

interface RateRecord {
  count: number;
  time: number;
}

const rateLimitStore = new Map<string, RateRecord>();

export function rateLimiter({ limit = 10, windowMs = 60 * 1000 } = {}) {
  return (req: any, res?: any): boolean => {
    const ip =
      (typeof req?.headers?.get === 'function' ? req.headers.get("x-forwarded-for") : null) ||
      req?.headers?.["x-forwarded-for"] ||
      req?.socket?.remoteAddress ||
      "127.0.0.1";

    const now = Date.now();
    const record = rateLimitStore.get(ip) || { count: 0, time: now };

    if (now - record.time < windowMs) {
      if (record.count >= limit) {
        if (res?.status) {
          res.status(429).json({ message: "Too many login attempts. Please try again later." });
        }
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

export default rateLimiter;
