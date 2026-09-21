import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  

  try {
    const feedbacks = await prisma.contact_submissions.findMany({
    orderBy: { created_at: "desc" }    });
    return NextResponse.json({ feedbacks }, { status: 200 });
  } catch (error) {
    console.error("Error fetching contact submissions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


