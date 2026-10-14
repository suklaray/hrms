//trracks the db changes automatically and logs them to the audit table. It also tracks the user who made the changes and the IP address of the request.
//audit logging
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const [{ installAuditExtension }, { withPrismaAudit }] = await Promise.all([
    import("@/lib/prisma"),
    import("@/lib/auditPrismaExtension"),
  ]);

  installAuditExtension(withPrismaAudit);
}
