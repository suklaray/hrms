import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRequestBody } from "@/lib/routeHelper";

export async function POST(req: NextRequest) {
  const { id, status } = (await getRequestBody(req)) || {};

  try {
    const result = await prisma.leave_requests.updateMany({
      where: { id: id },
      data: { status: status },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    return NextResponse.json({ message: `Leave request ${status}` }, { status: 200 });
  } catch (error) {
    console.error('Error updating leave request status:', error);
    return NextResponse.json({ error: 'Failed to update leave request status' }, { status: 500 });
  }
}
