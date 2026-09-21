import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import { verifyEmployeeToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await verifyEmployeeToken(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  try {
    const formData = await req.formData();
    const leave_type = formData.get('leave_type') as string;
    const reason = formData.get('reason') as string;
    const from_date_val = formData.get('from_date') as string;
    const to_date_val = formData.get('to_date') as string;

    const from_date = new Date(from_date_val);
    const to_date = new Date(to_date_val);

    let attachment: string | null = null;
    const file = formData.get('attachment') as File | null;

    if (file && typeof file !== 'string' && file.name) {
      const fileName = `${Date.now()}-${file.name}`;
      const finalPath = path.join(uploadDir, fileName);
      const bytes = await file.arrayBuffer();
      await fs.promises.writeFile(finalPath, Buffer.from(bytes));
      attachment = `/uploads/${fileName}`;
    }

    await prisma.leave_requests.create({
      data: {
        empid: user.empid,
        name: user.name,
        leave_type,
        from_date: new Date(from_date),
        to_date: new Date(to_date),
        applied_at: new Date(),
        reason,
        attachment,
      },
    });

    return NextResponse.json({ message: 'Leave request submitted successfully' }, { status: 200 });
  } catch (err: any) {
    console.error("Leave request error:", err);
    return NextResponse.json({ message: 'Database error' }, { status: 500 });
  }
}
