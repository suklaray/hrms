import { formidable } from 'formidable';
import fs from 'fs';
import path from 'path';
import { validateResumeFile, extractResumeText } from '@/lib/resumeParser/extractText';
import { parseResumeWithGemini } from '@/lib/resumeParser/geminiParser';
import prisma from '@/lib/prisma';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  const form = formidable({ multiples: false, maxFileSize: 5 * 1024 * 1024 });

  let files;
  try {
    [, files] = await form.parse(req);
  } catch (err) {
    return res.status(400).json({ success: false, error: 'File upload failed: ' + err.message });
  }

  const file = Array.isArray(files.resume) ? files.resume[0] : files.resume;
  if (!file) {
    return res.status(400).json({ success: false, error: 'No resume file uploaded.' });
  }

  const validation = validateResumeFile(file);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  // Save file to public/uploads/ (same as aadhar/pan)
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const fileName = `${Date.now()}-${file.originalFilename}`;
  const finalPath = path.join(uploadsDir, fileName);
  fs.copyFileSync(file.filepath, finalPath);
  fs.unlinkSync(file.filepath);
  const resumePath = `/uploads/${fileName}`;

  let resumeText;
  try {
    resumeText = await extractResumeText({ ...file, filepath: finalPath });
  } catch (err) {
    return res.status(422).json({ success: false, error: 'Text extraction failed: ' + err.message });
  }

  if (!resumeText || resumeText.trim().length < 50) {
    return res.status(422).json({
      success: false,
      error: 'Could not extract meaningful text from the resume.',
    });
  }

  let parsed;
  try {
    parsed = await parseResumeWithGemini(resumeText);
  } catch (err) {
    return res.status(502).json({ success: false, error: 'Resume parsing failed: ' + err.message });
  }

  const pi = parsed.personalInformation;
  const ai = parsed.additionalInformation;

  let record;
  try {
    record = await prisma.parsed_resumes.create({
      data: {
        full_name:               pi.fullName,
        email:                   pi.emailAddress,
        mobile_number:           pi.mobileNumber,
        alternate_phone:         pi.alternatePhoneNumber,
        current_address:         pi.currentAddress,
        city:                    pi.city,
        state:                   pi.state,
        country:                 pi.country,
        linkedin_profile:        pi.linkedInProfile,
        portfolio_url:           pi.portfolioUrl,
        github_url:              pi.githubUrl,
        career_objective:        parsed.professionalInformation.careerObjective,
        professional_summary:    parsed.professionalInformation.professionalSummary,
        work_experience:         parsed.workExperience,
        education:               parsed.education,
        technical_skills:        parsed.skills.technicalSkills,
        soft_skills:             parsed.skills.softSkills,
        certifications:          parsed.certifications,
        languages_known:         parsed.languagesKnown,
        projects:                parsed.projects,
        awards_and_achievements: parsed.awardsAndAchievements,
        publications:            parsed.publications,
        training:                parsed.training,
        notice_period:           ai.noticePeriod,
        current_salary:          ai.currentSalary,
        expected_salary:         ai.expectedSalary,
        preferred_location:      ai.preferredLocation,
        resume_file_path:        resumePath,
        original_file_name:      file.originalFilename,
        resume_mime_type:        file.mimetype,
        resume_file_size:        file.size,
        parsing_status:          'DONE',
        ai_model:                'gemini-3.6-flash',
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to save to database: ' + err.message });
  }

  return res.status(200).json({ success: true, data: parsed, recordId: record.id });
}
