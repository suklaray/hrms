import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const auth = await checkAuth(req, [PERMISSION_KEYS.CUSTOMER_DELETE]);
  if (auth.error) return auth.error;

  const body = (await getRequestBody(req)) || {};

  

  const { ids } = body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No messages selected." }, { status: 400 });
  }

  try {
    await prisma.contact_submissions.deleteMany({
      where: { id: { in: ids } },
    });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Failed to delete messages." }, { status: 500 });
  }
}

