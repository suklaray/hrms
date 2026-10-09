/**
 * Audit Middleware
 *
 * Manual usage inside any handler:
 *   await logAudit({ req, user, action: "employee.create", module: "employee" });
 *
 * Wrapper usage (auto-logs mutating methods):
 *   export const POST = withAudit("employee.create", "employee")(handler);
 *
 * Approval gate:
 *   const ok = await isAuditApproved(uid);
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import getUserFromToken from "@/lib/getUserFromToken";
import { parse } from "cookie";
import type { DecodedToken } from "@/types";

const LOGGABLE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Never log requests to the audit routes themselves — prevents loops
const SKIP_PREFIXES = ["/api/audit/"];

export interface AuditLogInput {
  req?: NextRequest;
  user?: DecodedToken | null;
  action: string;
  module: string;
  description?: string;
  targetId?: string;
  requiresApproval?: boolean;
}

function resolveUser(req: NextRequest): DecodedToken | null {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = parse(cookieHeader);
    const token = cookies.token || req.cookies.get("token")?.value;
    return token ? (getUserFromToken(token) as DecodedToken | null) : null;
  } catch {
    return null;
  }
}

function shouldSkip(req?: NextRequest): boolean {
  if (!req) return false;
  const path = req.nextUrl?.pathname ?? new URL(req.url).pathname;
  return SKIP_PREFIXES.some((p) => path.startsWith(p));
}

/** Write one audit record. Never throws. Returns the created log. */
export async function logAudit(input: AuditLogInput): Promise<{ uid: string } | null> {
  if (shouldSkip(input.req)) return null;

  try {
    const { req, user: explicitUser, action, module, description, targetId, requiresApproval = false } = input;
    const user = explicitUser ?? (req ? resolveUser(req) : null);

    const userId = user?.id ? Number(user.id) : null;
    const userIdSafe = userId && Number.isFinite(userId) && userId > 0 ? userId : null;

    const log = await prisma.audit_logs.create({
      data: {
        userId: userIdSafe,
        userName: (user as any)?.name ?? null,
        userRole: user?.role ?? null,
        action,
        module,
        description: description ?? null,
        targetId: targetId ?? null,
        currentStatus: requiresApproval ? "PENDING" : "NOT_REQUIRED",
        reviewedBy: null,
        reviewedAt: null,
      },
    });
    return { uid: log.uid };
  } catch (err) {
    console.error("[AuditMiddleware] Failed to write audit log:", err);
    return null;
  }
}

/** Wrap a handler to auto-log on POST/PUT/PATCH/DELETE. */
export function withAudit(
  action: string,
  module: string,
  opts: { description?: string; requiresApproval?: boolean } = {}
) {
  return function <T extends (req: NextRequest, ctx?: any) => Promise<NextResponse>>(handler: T): T {
    return (async (req: NextRequest, ctx?: any) => {
      const response = await handler(req, ctx);
      if (LOGGABLE_METHODS.has(req.method?.toUpperCase() ?? "") && !shouldSkip(req)) {
        const user = resolveUser(req);
        await logAudit({
          req, user, action, module,
          description: opts.description,
          requiresApproval: opts.requiresApproval ?? false,
        });
      }
      return response;
    }) as T;
  };
}

/**
 * Check if a pending audit log has been approved.
 * Use this to gate the next workflow step.
 */
export async function isAuditApproved(uid: string): Promise<boolean> {
  const log = await prisma.audit_logs.findUnique({
    where: { uid },
    select: { currentStatus: true },
  });
  if (!log) return false;
  return log.currentStatus === "APPROVED" || log.currentStatus === "NOT_REQUIRED";
}
