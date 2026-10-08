import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const auth = await checkAuth(req, [PERMISSION_KEYS.CUSTOMER_VIEW]);
  if (auth.error) return auth.error;

  try {
    const feedbacks = await prisma.contact_submissions.findMany({
    orderBy: { created_at: "desc" }    });
    return NextResponse.json({ feedbacks }, { status: 200 });
  } catch (error) {
    console.error("Error fetching contact submissions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

