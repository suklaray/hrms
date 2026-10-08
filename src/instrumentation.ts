export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const [{ installAuditExtension }, { withPrismaAudit }] = await Promise.all([
    import("@/lib/prisma"),
    import("@/lib/auditPrismaExtension"),
  ]);

  installAuditExtension(withPrismaAudit);
}
