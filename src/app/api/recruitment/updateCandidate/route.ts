import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function PUT(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    const candidate_id = formData.get('candidate_id') as string;
    const contact_number = formData.get('contact_number') as string;
    const interview_date = formData.get('interview_date') as string;
    const interview_time_from = formData.get('interview_time_from') as string;
    const interview_time_to = formData.get('interview_time_to') as string;

    if (!candidate_id) {
      return NextResponse.json({ error: 'Candidate ID is required' }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (contact_number) updateData.contact_number = contact_number;
    if (interview_date) updateData.interview_date = new Date(interview_date);
    if (interview_time_from) updateData.interview_time_from = interview_time_from;
    if (interview_time_to) updateData.interview_time_to = interview_time_to;

    // Handle resume file upload
    const resumeFile = formData.get('resume') as File | null;
    if (resumeFile && typeof resumeFile !== 'string' && resumeFile.name) {
      const fileName = `resume_${candidate_id}_${Date.now()}${path.extname(resumeFile.name)}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const uploadPath = path.join(uploadDir, fileName);
      const bytes = await resumeFile.arrayBuffer();
      await fs.promises.writeFile(uploadPath, Buffer.from(bytes));
      updateData.resume = `/uploads/${fileName}`;
    }

    const updatedCandidate = await prisma.candidates.update({
      where: { candidate_id: candidate_id },
      data: updateData
    });

    return NextResponse.json({ message: 'Candidate updated successfully', candidate: updatedCandidate }, { status: 200 });
  } catch (error) {
    console.error('Error updating candidate:', error);
    return NextResponse.json({ error: 'Failed to update candidate' }, { status: 500 });
  }
}
