import type { PrismaClient } from "@prisma/client";
import { headers } from "next/headers";
import { parse } from "cookie";
import getUserFromToken from "@/lib/getUserFromToken";

type AuditRecord = Record<string, unknown>;

const AUDITED_OPERATIONS = new Set([
  "create", "createMany", "update", "updateMany", "upsert", "delete", "deleteMany",
]);

// These models must NEVER be audited — prevents infinite loop
const SKIP_MODELS = new Set([
  "audit_logs", "session", "assistant_learning", "notifications",
]);

const SKIP_ENDPOINT_PREFIXES = ["/api/audit/", "/api/session/", "/api/health", "/api/auth/"];

const SENSITIVE_FIELD = /password|token|secret|credential|account.?number|ifsc/i;
const TECHNICAL_FIELD = /(^id$|uid|empid|Id$|created|updated|timestamp|token|password|secret)/i;

const DISPLAY_NAMES: Record<string, string> = {
  users: "Employee", tasks: "Task", departments: "Department",
  positions: "Position", leave_requests: "Leave Request",
  candidates: "Candidate", payroll: "Payroll",
  job_descriptions: "Job Description", parsed_resumes: "Job Application",
};

function displayName(model: string): string {
  return DISPLAY_NAMES[model] ?? model.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function sanitize(value: unknown, key = ""): unknown {
  if (SENSITIVE_FIELD.test(key)) return "[REDACTED]";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map((v) => sanitize(v));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, sanitize(v, k)])
    );
  }
  return value ?? null;
}

function getChangeSummary(before?: AuditRecord, after?: AuditRecord): string {
  if (!before && after) return `${displayName("")} created`;
  if (!after) return "Record deleted";
  const changes: string[] = [];
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  for (const key of keys) {
    if (TECHNICAL_FIELD.test(key) || SENSITIVE_FIELD.test(key)) continue;
    const ov = (before ?? {})[key] ?? null;
    const nv = (after ?? {})[key] ?? null;
    if (JSON.stringify(ov) !== JSON.stringify(nv)) {
      changes.push(`${key.replace(/_/g, " ")} changed`);
    }
  }
  return changes.length ? changes.slice(0, 5).join(", ") : "Record updated";
}

function getResourceId(record?: AuditRecord | null): string | undefined {
  if (!record) return undefined;
  const v = record.uid ?? record.empid ?? record.id;
  return v == null ? undefined : String(v);
}

function getApprovalStatusChange(
  model: string,
  before?: AuditRecord,
  after?: AuditRecord
): { oldStatus: string; newStatus: string } | undefined {
  if (
    !before ||
    !after ||
    !["job_descriptions", "parsed_resumes"].includes(model) ||
    before.approval_status === after.approval_status
  ) {
    return undefined;
  }

  return {
    oldStatus: String(before.approval_status ?? "NOT_REQUIRED"),
    newStatus: String(after.approval_status ?? "NOT_REQUIRED"),
  };
}

async function getRequestContext() {
  try {
    const h = await headers();
    const endpoint = h.get("x-audit-endpoint");
    const method = h.get("x-audit-method")?.toUpperCase();

    if (
      !endpoint?.startsWith("/api/") ||
      !method ||
      !["POST", "PUT", "PATCH", "DELETE"].includes(method) ||
      SKIP_ENDPOINT_PREFIXES.some((p) => endpoint.startsWith(p))
    ) return null;

    const cookies = parse(h.get("cookie") ?? "");
    const auth = h.get("authorization");
    const token = cookies.token ?? (auth?.startsWith("Bearer ") ? auth.slice(7) : undefined);

    return {
      endpoint,
      method,
      user: getUserFromToken(token) as any,
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined,
    };
  } catch {
    return null;
  }
}

export function withPrismaAudit(client: PrismaClient) {
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Hard skip — prevents infinite loop on audit_logs writes
          if (!model || SKIP_MODELS.has(model) || !AUDITED_OPERATIONS.has(operation)) {
            return query(args);
          }

          const context = await getRequestContext();
          if (!context) return query(args);

          const moduleName = context.endpoint.split("/").filter(Boolean)[1] ?? model;
          const actionName = operation.replace(/Many$/, "");
          const action = `${moduleName}.${actionName}`;

          // Capture before state for updates/deletes
          let before: AuditRecord | undefined;
          if (["update", "upsert", "delete"].includes(operation)) {
            try {
              const delegate = (client as any)[model];
              const rec = await delegate?.findFirst({ where: (args as any).where });
              before = rec ? (sanitize(rec) as AuditRecord) : undefined;
            } catch { /* non-fatal */ }
          }

          // Run the actual query
          const result = await query(args);

          // Build description
          const isDelete = operation === "delete" || operation === "deleteMany";
          const isCreate = operation === "create" || operation === "createMany" || (operation === "upsert" && !before);
          const after = !isDelete ? (sanitize(result) as AuditRecord) : undefined;
          const approvalStatusChange = getApprovalStatusChange(model, before, after);

          let description: string;
          if (isCreate) description = `${displayName(model)} created`;
          else if (approvalStatusChange) {
            description = `${displayName(model)} approval status changed from ${approvalStatusChange.oldStatus} to ${approvalStatusChange.newStatus}`;
          }
          else if (isDelete) description = `${displayName(model)} deleted`;
          else description = getChangeSummary(before, after);

          // Write audit log — uses raw prisma to avoid re-triggering extension
          try {
            const userId = context.user?.id ? Number(context.user.id) : null;
            await (client as any).audit_logs.create({
              data: {
                userId: userId && Number.isFinite(userId) ? userId : null,
                userName: context.user?.name ?? null,
                userRole: context.user?.role ?? null,
                action,
                module: moduleName,
                description,
                targetId: getResourceId(after ?? before),
                currentStatus: approvalStatusChange?.newStatus ?? "NOT_REQUIRED",
                oldStatus: approvalStatusChange?.oldStatus ?? null,
                newStatus: approvalStatusChange?.newStatus ?? null,
              },
            });
          } catch (err) {
            console.error("[AuditExtension] Failed to write log:", err);
          }

          return result;
        },
      },
    },
  });
}
