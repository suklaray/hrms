import { NextRequest, NextResponse } from "next/server";
import { formidable } from "formidable";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { validateResumeFile, extractResumeText } from "@/lib/resumeParser/extractText";
import { parseResumeWithGemini } from "@/lib/resumeParser/geminiParser";
import { scoreCandidateWithGemini } from "@/lib/resumeParser/candidateMatcher";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const asList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap((item) => asList(item));
  if (value === null || value === undefined || value === "") return [];
  if (typeof value === "object") return Object.values(value).flatMap((item) => asList(item));
  return String(value)
    .split(/[,;\n]/)
    .flatMap((item) => item.split("|"))
    .map((item) => item.trim())
    .filter(Boolean);
};

export async function POST(req: NextRequest) {
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
    include: { analysis: true },
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: "Resume parsing failed: " + message },
      { status: 502 }
    );
  }

  const pi = parsed.personalInformation;
  const ai = parsed.additionalInformation;

  let matchingScore: number;

  try {
    const jobForScoring = {
      ...jobDescription,
      required_skills: asList(jobDescription.required_skills).join(", "),
      preferred_skills: asList(jobDescription.preferred_skills).join(", "),
    };

    const match = await scoreCandidateWithGemini(jobForScoring, jobDescription.analysis, {
      full_name: pi.fullName,
      professional_summary: parsed.professionalInformation.professionalSummary,
      career_objective: parsed.professionalInformation.careerObjective,
      technical_skills: parsed.skills.technicalSkills,
      soft_skills: parsed.skills.softSkills,
      work_experience: parsed.workExperience,
      education: parsed.education,
      certifications: parsed.certifications,
      projects: parsed.projects,
    });

    matchingScore = match.score;
  } catch (err) {
    console.error("Candidate matching failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: "Candidate matching failed: " + message },
      { status: 502 }
    );
  }

  let record: { id: number };
  try {
    record = await prisma.parsed_resumes.create({
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
        matching_score: matchingScore,
      },
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
    matchingScore: matchingScore,
    jobDescription: { id: jobDescription.id, title: jobDescription.title },
  });
}