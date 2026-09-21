import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { parse } from "cookie";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

async function checkAuth(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = parse(cookieHeader);
  const token = cookies.token || req.cookies.get("token")?.value;
  const user = token ? getUserFromToken(token) : null;

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const hasViewAccess = await checkPermission(user, PERMISSION_KEYS.SETTINGS_POSITION_VIEW);
  const hasManageAccess = await checkPermission(user, PERMISSION_KEYS.SETTINGS_POSITION_MANAGE);

  if (!hasViewAccess && !hasManageAccess) {
    return { error: NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 }) };
  }

  return { user, hasManageAccess };
}

export async function GET(req: NextRequest) {
  const auth = await checkAuth(req);
  if (auth.error) return auth.error;

  try {
    const positions = await prisma.positions.findMany({
      include: {
        users: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    const formattedPositions = positions.map(pos => ({
      ...pos,
      created_by_name: pos.users.name
    }));
    
    return NextResponse.json(formattedPositions, { status: 200 });
  } catch (error) {
    console.error("Error fetching positions:", error);
    return NextResponse.json({ error: "Failed to fetch positions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await checkAuth(req);
  if (auth.error) return auth.error;
  if (!auth.hasManageAccess) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
  }
  const user = auth.user;

  try {
    const body = await req.json().catch(() => ({}));
    const { position_name, description } = body;
    
    if (!position_name) {
      return NextResponse.json({ error: "Position name is required" }, { status: 400 });
    }

    const position = await prisma.positions.create({
      data: {
        position_name,
        description: description || null,
        created_by: user.empid
      }
    });

    return NextResponse.json({ message: "Position created successfully", position }, { status: 201 });
  } catch (error) {
    console.error("Error creating position:", error);
    return NextResponse.json({ error: "Failed to create position" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await checkAuth(req);
  if (auth.error) return auth.error;
  if (!auth.hasManageAccess) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const idStr = req.nextUrl.searchParams.get("id") || body.id;
    const { position_name, description } = body;
    
    if (!idStr || !position_name) {
      return NextResponse.json({ error: "Position ID and name are required" }, { status: 400 });
    }

    await prisma.positions.update({
      where: { id: parseInt(idStr) },
      data: {
        position_name,
        description: description || null
      }
    });

    return NextResponse.json({ message: "Position updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating position:", error);
    return NextResponse.json({ error: "Failed to update position" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await checkAuth(req);
  if (auth.error) return auth.error;
  if (!auth.hasManageAccess) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  try {
    const idStr = req.nextUrl.searchParams.get("id");
    if (!idStr) {
      return NextResponse.json({ error: "Position ID is required" }, { status: 400 });
    }
    
    const position = await prisma.positions.findUnique({
      where: { id: parseInt(idStr) },
      select: { position_name: true }
    });
    
    if (!position) {
      return NextResponse.json({ error: "Position not found" }, { status: 404 });
    }
    
    const employeesWithPosition = await prisma.users.count({
      where: {
        position: position.position_name,
        status: "Active"
      }
    });
    
    if (employeesWithPosition > 0) {
      return NextResponse.json({ 
        error: "Cannot delete position", 
        message: `${employeesWithPosition} active employee(s) are assigned to this position. Please reassign them first.`,
        hasEmployees: true
      }, { status: 400 });
    }
    
    await prisma.positions.delete({
      where: { id: parseInt(idStr) }
    });
    
    return NextResponse.json({ message: "Position deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting position:", error);
    return NextResponse.json({ error: "Failed to delete position" }, { status: 500 });
  }
}
