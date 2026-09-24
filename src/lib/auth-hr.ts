import jwt from "jsonwebtoken";
import * as cookie from "cookie";
import prisma from "@/lib/prisma";
import { DecodedToken } from "@/types";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function verifyHRToken(req: any): Promise<DecodedToken | null> {
  try {
    const cookieHeader =
      req?.headers?.cookie ||
      (typeof req?.headers?.get === "function" ? req.headers.get("cookie") : "") ||
      "";
    const cookies = cookie.parse(cookieHeader);
    const token = cookies.token;
    const sessionToken = cookies.sessionToken;

    if (!token || !sessionToken) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    if (!decoded?.id) return null;

    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session || !session.user) return null;
    if (session.userId !== Number(decoded.id)) return null;
    if (session.expiresAt.getTime() <= Date.now()) {
      await prisma.session.deleteMany({ where: { id: session.id } }).catch(() => undefined);
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export default verifyHRToken;
