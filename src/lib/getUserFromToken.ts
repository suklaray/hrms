// src/lib/getUserFromToken.ts
import jwt from "jsonwebtoken";
import { DecodedToken } from "@/types";

export function getUserFromToken(token?: string | null): DecodedToken | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret") as DecodedToken;
    return decoded;
  } catch {
    return null;
  }
}

export default getUserFromToken;
