import { getQueryParams } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(req: NextRequest, context?: { params?: Promise<any> }) {
  const query = await getQueryParams(req, context?.params);

  const { id } = query;

  

  try {
    // Set user status to Inactive instead of deleting
    await prisma.users.update({
      where: { id: parseInt(id) },
      data: { status: "Inactive" },
    });

    return NextResponse.json({ message: "User made inactive successfully" }, { status: 200 });
  } catch (error) {
    console.error("Prisma Update Error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}


