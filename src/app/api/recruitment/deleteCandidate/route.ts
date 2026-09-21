import { getQueryParams } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(req: NextRequest, context?: { params?: Promise<any> }) {
  const query = await getQueryParams(req, context?.params);

  

  const { candidate_id } = query;

  if (!candidate_id) {
    return NextResponse.json({ message: "Candidate ID is required" }, { status: 400 });
  }

  try {
    await prisma.candidates.delete({
      where: { candidate_id: candidate_id }
    });

    return NextResponse.json({ message: "Candidate deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting candidate:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}


