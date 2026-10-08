import { NextRequest, NextResponse } from "next/server";
import { formidable } from "formidable";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { validateResumeFile, extractResumeText } from "@/lib/resumeParser/extractText";
import { parseResumeWithGemini } from "@/lib/resumeParser/geminiParser";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export const runtime = "nodejs";

function getGeminiFailureMessage(error: unknown, task: string): string {
  const details = error instanceof Error ? error.message : String(error);
  const status =
    error && typeof error === "object" && "status" in error
      ? Number(error.status)
      : undefined;

  if (
    status === 429 ||
    /quota exceeded|quota.*limit|free.?tier.*requestsperday/i.test(details)
  ) {
    return "Gemini's request quota has been reached. Check your plan or billing, or try again after the quota resets.";
  }

  if (status === 503 || /high demand|service unavailable/i.test(details)) {
    return "Gemini is temporarily busy. Please try again shortly.";
  }

  return `${task} failed. Please try again later.`;
}

export async function POST(req: NextRequest) {
  const { error } = await checkAuth(req, [PERMISSION_KEYS.JOB_APPLICATION_PARSE]);
  if (error) return error;

  const form = formidable({ multiples: false, maxFileSize: 5 * 1024 * 1024 });

  let fields: Record<string, unknown>;
  let files: Record<string, unknown>;

  try {
    // Convert NextRequest (Web Request) into a Node Readable stream
    const nodeReq = Readable.fromWeb(req.body as any);
    // formidable needs headers (for content-length & content-type)
    (nodeReq as any).headers = Object.fromEntries(req.headers.entries());

    [fields, files] = await form.parse(nodeReq as any);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: "File upload failed: " + message },
      { status: 400 }
    );
  }

  const jobDescriptionIdRaw = Array.isArray(fields.job_description_id)
    ? fields.job_description_id[0]
    : fields.job_description_id;
  const jobDescriptionId = Number(jobDescriptionIdRaw);

  if (!Number.isInteger(jobDescriptionId)) {
    return NextResponse.json(
      { success: false, error: "A valid job description is required." },
      { status: 400 }
    );
  }

  const jobDescription = await prisma.job_descriptions.findUnique({
    where: { id: jobDescriptionId },
  });

  if (!jobDescription) {
    return NextResponse.json(
      { success: false, error: "Selected job description was not found." },
      { status: 404 }
    );
  }

  const fileRaw = files.resume;
  const file = Array.isArray(fileRaw) ? fileRaw[0] : fileRaw;
  if (!file) {
    return NextResponse.json(
      { success: false, error: "No resume file uploaded." },
      { status: 400 }
    );
  }

  const validation = validateResumeFile(file);
  if (!validation.valid) {
    return NextResponse.json(
      { success: false, error: validation.error },
      { status: 400 }
    );
  }

  // Save file to public/uploads/
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const fileName = `${Date.now()}-${file.originalFilename}`;
  const finalPath = path.join(uploadsDir, fileName);
  fs.copyFileSync(file.filepath, finalPath);
  fs.unlinkSync(file.filepath);
  const resumePath = `/uploads/${fileName}`;

  let resumeText: string;
  try {
    resumeText = await extractResumeText({ ...file, filepath: finalPath });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: "Text extraction failed: " + message },
      { status: 422 }
    );
  }

  if (!resumeText || resumeText.trim().length < 50) {
    return NextResponse.json(
      { success: false, error: "Could not extract meaningful text from the resume." },
      { status: 422 }
    );
  }

  let parsed: any;
  try {
    parsed = await parseResumeWithGemini(resumeText);
  } catch (err) {
    console.error("Resume parsing failed:", err);
    return NextResponse.json(
      { success: false, error: getGeminiFailureMessage(err, "Resume parsing") },
      { status: 502 }
    );
  }

  const pi = parsed.personalInformation;
  const ai = parsed.additionalInformation;

  let record: { id: number };
  try {
    record = await prisma.$transaction(async (transaction) => {
      const resume = await transaction.parsed_resumes.create({
        data: {
          full_name: pi.fullName,
          email: pi.emailAddress,
          mobile_number: pi.mobileNumber,
          alternate_phone: pi.alternatePhoneNumber,
          current_address: pi.currentAddress,
          city: pi.city,
          state: pi.state,
          country: pi.country,
          linkedin_profile: pi.linkedInProfile,
          portfolio_url: pi.portfolioUrl,
          github_url: pi.githubUrl,
          career_objective: parsed.professionalInformation.careerObjective,
          professional_summary: parsed.professionalInformation.professionalSummary,
          work_experience: parsed.workExperience,
          education: parsed.education,
          technical_skills: parsed.skills.technicalSkills,
          soft_skills: parsed.skills.softSkills,
          certifications: parsed.certifications,
          languages_known: parsed.languagesKnown,
          projects: parsed.projects,
          awards_and_achievements: parsed.awardsAndAchievements,
          publications: parsed.publications,
          training: parsed.training,
          notice_period: ai.noticePeriod,
          current_salary: ai.currentSalary,
          expected_salary: ai.expectedSalary,
          preferred_location: ai.preferredLocation,
          resume_file_path: resumePath,
          original_file_name: file.originalFilename,
          resume_mime_type: file.mimetype,
          resume_file_size: file.size,
          parsing_status: "DONE",
          ai_model: "gemini-3.6-flash",
          job_description_id: jobDescriptionId,
          matching_score: null,
        },
      });

      await transaction.candidate_job_matches.create({
        data: {
          job_description_id: jobDescriptionId,
          parsed_resume_id: resume.id,
          processing_status: "PENDING",
        },
      });

      return resume;
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: "Failed to save to database: " + message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: parsed,
    recordId: record.id,
    matchingStatus: "PENDING",
    jobDescription: { id: jobDescription.id, title: jobDescription.title },
  });
}