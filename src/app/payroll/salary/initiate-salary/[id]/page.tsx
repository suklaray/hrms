import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ClientPage from "./Client";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { checkAnyPermission, getUserPermissions } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export const dynamic = "force-dynamic";

async function getServerSideProps({ req }: any) {
    const token = req?.cookies?.token || '';
    const user = getUserFromToken(token);
    if (!user) return { redirect: { destination: '/login', permanent: false } };
    const hasAccess = await checkAnyPermission(user, [
        PERMISSION_KEYS.PAYSLIP_GENERATE,
        PERMISSION_KEYS.PAYSLIP_INITIATE,
        PERMISSION_KEYS.PAYSLIP_VIEW,
    ]);
    if (!hasAccess) return { redirect: { destination: '/403', permanent: false } };

    const permissions = await getUserPermissions(user);

    return {
        props: {
            user: {
                id: user.id,
                empid: user.empid,
                name: user.name,
                role: user.role,
                email: user.email,
            },
            permissions: Array.from(permissions),
        }
    };
}

export default async function Page(props: {
    params?: Promise<Record<string, string | string[]>>;
    searchParams?: Promise<Record<string, string | string[]>>;
}) {
    const cookieStore = await cookies();
    const resolvedParams = (await props.params) || {};
    const resolvedSearchParams = (await props.searchParams) || {};

    const cookieMap: Record<string, string> = {};
    cookieStore.getAll().forEach((c) => {
        cookieMap[c.name] = c.value;
    });

    const context = {
        req: {
            cookies: cookieMap,
            headers: {},
        },
        params: resolvedParams,
        query: { ...resolvedParams, ...resolvedSearchParams },
    };

    let gsspResult: any = null;
    try {
        gsspResult = await getServerSideProps(context);
    } catch (err) {
        console.error("Error running getServerSideProps in payroll/generate:", err);
    }

    if (gsspResult?.redirect?.destination) {
        redirect(gsspResult.redirect.destination);
    }

    return (
        <Suspense fallback={null}>
            <ClientPage id={resolvedParams.id as string} params={resolvedParams} {...(gsspResult?.props || {})} />
        </Suspense>
    );
}
