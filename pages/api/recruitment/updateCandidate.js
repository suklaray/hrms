import prisma from '../../../lib/prisma';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      uploadDir: './public/uploads',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await form.parse(req);
    
    const candidate_id = fields.candidate_id?.[0];
    const contact_number = fields.contact_number?.[0];
    const interview_date = fields.interview_date?.[0];
    const interview_time_from = fields.interview_time_from?.[0];
    const interview_time_to = fields.interview_time_to?.[0];

    if (!candidate_id) {
      return res.status(400).json({ error: 'Candidate ID is required' });
    }

    const updateData = {};
    if (contact_number) updateData.contact_number = contact_number;
    if (interview_date) updateData.interview_date = new Date(interview_date);
    if (interview_time_from) updateData.interview_time_from = interview_time_from;
    if (interview_time_to) updateData.interview_time_to = interview_time_to;

    // Handle resume file upload
    if (files.resume && files.resume[0]) {
      const file = files.resume[0];
      const fileName = `resume_${candidate_id}_${Date.now()}${path.extname(file.originalFilename)}`;
      const uploadPath = path.join('./public/uploads', fileName);
      
      // Ensure upload directory exists
      const uploadDir = path.dirname(uploadPath);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // Move file to permanent location
      fs.renameSync(file.filepath, uploadPath);
      updateData.resume = `/uploads/${fileName}`;
    }

    const updatedCandidate = await prisma.candidates.update({
      where: { candidate_id: candidate_id },
      data: updateData
    });

    res.status(200).json({ message: 'Candidate updated successfully', candidate: updatedCandidate });
  } catch (error) {
    console.error('Error updating candidate:', error);
    res.status(500).json({ error: 'Failed to update candidate' });
  } finally {
    await prisma.$disconnect();
  }
}