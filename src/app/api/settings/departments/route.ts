import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSIONS } from "@/rbac/permissions";

const ALLOWED_ROLES = ["admin", "hr", "superadmin"];

interface DepartmentBody {
  name?: string;
  description?: string | null;
}

async function verifyDepartmentAccess(request: NextRequest) {
  const auth = await checkAuth(request, [PERMISSIONS.SETTINGS.MANAGE]);
  if (auth.user) {
    if (auth.error) {
      if (ALLOWED_ROLES.includes(auth.user.role)) {
        return { user: auth.user, error: null };
      }
      return { user: null, error: auth.error };
    }
    return { user: auth.user, error: null };
  }
  return { user: null, error: auth.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
}

export async function GET(request: NextRequest) {
  const { user, error } = await verifyDepartmentAccess(request);
  if (error) return error;

  try {
    const departments = await prisma.departments.findMany({
      include: {
        positions: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return NextResponse.json(departments, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch departments:", error);

    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { user, error } = await verifyDepartmentAccess(request);
  if (error || !user) return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body: DepartmentBody = await request.json();
    const { name, description } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Department name is required" },
        { status: 400 }
      );
    }

    const dept = await prisma.departments.create({
      data: {
        name: name.trim(),
        description: description || null,
        created_by: user.empid || String(user.id),
      },
    });

    return NextResponse.json(dept, { status: 201 });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };

    if (prismaError.code === "P2002") {
      return NextResponse.json(
        { error: "Department name already exists" },
        { status: 400 }
      );
    }

    console.error("Failed to create department:", error);

    return NextResponse.json(
      { error: "Failed to create department" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const { user, error } = await verifyDepartmentAccess(request);
  if (error || !user) return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");

    const body: DepartmentBody = await request.json();
    const { name, description } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Department name is required" },
        { status: 400 }
      );
    }

    const id = Number(idParam);

    if (!idParam || !Number.isInteger(id)) {
      return NextResponse.json(
        { error: "Invalid department id" },
        { status: 400 }
      );
    }

    await prisma.departments.update({
      where: {
        id,
      },
      data: {
        name: name.trim(),
        description: description || null,
      },
    });

    return NextResponse.json(
      { message: "Updated successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    const prismaError = error as { code?: string };

    if (prismaError.code === "P2002") {
      return NextResponse.json(
        { error: "Department name already exists" },
        { status: 400 }
      );
    }

    console.error("Failed to update department:", error);

    return NextResponse.json(
      { error: "Failed to update department" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { user, error } = await verifyDepartmentAccess(request);
  if (error || !user) return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");

    const id = Number(idParam);

    if (!idParam || !Number.isInteger(id)) {
      return NextResponse.json(
        { error: "Invalid department id" },
        { status: 400 }
      );
    }

    const dept = await prisma.departments.findUnique({
      where: {
        id,
      },
      include: {
        positions: true,
      },
    });

    if (!dept) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    if (dept.positions.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete — ${dept.positions.length} position(s) linked. Reassign them first.`,
        },
        { status: 400 }
      );
    }

    await prisma.departments.delete({
      where: {
        id,
      },
    });

    return NextResponse.json(
      { message: "Deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to delete department:", error);

    return NextResponse.json(
      { error: "Failed to delete department" },
      { status: 500 }
    );
  }
}