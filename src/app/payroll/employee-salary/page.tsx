import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ClientPage from "./Client";
import getUserFromToken from "@/lib/getUserFromToken";
import { checkAnyPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export const dynamic = "force-dynamic";

async function getServerSideProps() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value || "";
  const user = getUserFromToken(token);

  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const hasAccess = await checkAnyPermission(user, [
    PERMISSION_KEYS.PAYSLIP_GENERATE
  ]);

  if (!hasAccess) {
    return { redirect: { destination: "/403", permanent: false } };
  }

  return { props: { user } };
}

export default async function Page() {
  const gsspResult = await getServerSideProps();

  if (gsspResult?.redirect?.destination) {
    redirect(gsspResult.redirect.destination);
  }

  return (
    <Suspense fallback={null}>
      <ClientPage {...(gsspResult?.props || {})} />
    </Suspense>
  );
}
