import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { checkAuth } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  const auth = await checkAuth(req, [
    PERMISSION_KEYS.SETTINGS_POSITION_VIEW,
    PERMISSION_KEYS.SETTINGS_POSITION_ASSIGN,
  ]);
  if (auth.error) return auth.error;

  try {
    const positionName = req.nextUrl.searchParams.get("positionName");
    
    if (!positionName) {
      return NextResponse.json({ error: "Position name is required" }, { status: 400 });
    }

    // Get employees with this position
    const employees = await prisma.users.findMany({
      where: {
        position: positionName,
        status: "Active"
      },
      select: {
        empid: true,
        name: true,
        email: true,
        employee_type: true,
        role: true,
        position: true
      }
    });

    // Get all available positions for reassignment
    const availablePositions = await prisma.positions.findMany({
      where: {
        position_name: {
          not: positionName
        }
      },
      select: {
        id: true,
        position_name: true
      }
    });

    return NextResponse.json({
      employees,
      availablePositions
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching position employees:", error);
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await checkAuth(req, [
    PERMISSION_KEYS.SETTINGS_POSITION_ASSIGN,
  ]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json().catch(() => ({}));
    const { empid, newPosition } = body;
    
    if (!empid || !newPosition) {
      return NextResponse.json({ error: "Employee ID and new position are required" }, { status: 400 });
    }

    const employee = await prisma.users.findUnique({
      where: { empid },
      select: { role: true }
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    await prisma.users.update({
      where: { empid },
      data: { position: newPosition }
    });

    return NextResponse.json({
      message: "Employee position updated successfully"
    }, { status: 200 });
  } catch (error) {
    console.error("Error updating employee position:", error);
    return NextResponse.json({ error: "Failed to update employee position" }, { status: 500 });
  }
}
