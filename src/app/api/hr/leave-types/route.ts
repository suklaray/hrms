import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest) {
  const { error } = await checkAuth(req, [
    PERMISSION_KEYS.LEAVE_REQUEST,
    PERMISSION_KEYS.LEAVE_VIEW_OWN,
    PERMISSION_KEYS.LEAVE_VIEW,
    PERMISSION_KEYS.LEAVE_VIEW_LEAVE_TYPES,
    PERMISSION_KEYS.LEAVE_CREATE_TYPE,
    PERMISSION_KEYS.LEAVE_EDIT_TYPE,
    PERMISSION_KEYS.LEAVE_DELETE_TYPE,
  ]);
  if (error) return error;

  try {
    const leaveTypes = await prisma.leave_types.findMany({
      orderBy: { id: 'asc' }
    });
    return NextResponse.json({ success: true, data: leaveTypes }, { status: 200 });
  } catch (error) {
    console.error('Leave types API error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error } = await checkAuth(req, [PERMISSION_KEYS.LEAVE_CREATE_TYPE]);
  if (error) return error;

  try {
    const body = await req.json().catch(() => ({}));
    const { type_name, max_days, paid } = body;
    
    if (!type_name || !max_days) {
      return NextResponse.json({ success: false, message: 'Type name and max days are required' }, { status: 400 });
    }

    const newLeaveType = await prisma.leave_types.create({
      data: {
        type_name,
        max_days: parseInt(max_days),
        paid: paid === true || paid === 'true'
      }
    });

    return NextResponse.json({ success: true, data: newLeaveType }, { status: 201 });
  } catch (error) {
    console.error('Leave types API error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { error } = await checkAuth(req, [PERMISSION_KEYS.LEAVE_EDIT_TYPE]);
  if (error) return error;

  try {
    const body = await req.json().catch(() => ({}));
    const { id, type_name, max_days, paid } = body;
    
    if (!id) {
      return NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 });
    }

    const updatedLeaveType = await prisma.leave_types.update({
      where: { id: parseInt(id) },
      data: {
        type_name,
        max_days: parseInt(max_days),
        paid: paid === true || paid === 'true'
      }
    });

    return NextResponse.json({ success: true, data: updatedLeaveType }, { status: 200 });
  } catch (error) {
    console.error('Leave types API error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { error } = await checkAuth(req, [PERMISSION_KEYS.LEAVE_DELETE_TYPE]);
  if (error) return error;

  try {
    const body = await req.json().catch(() => ({}));
    const { id } = body;
    
    if (!id) {
      return NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 });
    }
    await prisma.leave_types.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true, message: 'Leave type deleted successfully' }, { status: 200 });     
  } catch (error) {
    console.error('Leave types API error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
