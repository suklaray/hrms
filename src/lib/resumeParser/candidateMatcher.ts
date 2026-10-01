//C:\OfficeWork\hrms\lib\resumeParser\candidateMatcher.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const TRANSIENT_GEMINI_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_GEMINI_RETRIES = 2;

interface GeminiError extends Error {
  status?: number;
}

interface JobDescription {
  title?: string;
  department?: string;
  experience?: string;
  education?: string;
  required_skills?: string;
  preferred_skills?: string;
  responsibilities?: string;
  summary?: string;
  keywords?: string;
}

interface CandidateProfile {
  full_name?: string;
  professional_summary?: string;
  career_objective?: string;
  technical_skills?: unknown;
  soft_skills?: unknown;
  work_experience?: unknown;
  education?: unknown;
  certifications?: unknown;
  projects?: unknown;
}

interface CandidateProfileResult {
  name: string;
  professionalSummary?: string;
  careerObjective?: string;
  technicalSkills?: unknown;
  softSkills?: unknown;
  workExperience?: unknown;
  education?: unknown;
  certifications?: unknown;
  projects?: unknown;
}

interface JobAnalysis {
  [key: string]: unknown;
}

interface MatchBreakdown {
  requiredSkills: number;
  preferredSkills: number;
  education: number;
  experience: number;
  roleRelevance: number;
}

interface CandidateMatch {
  score: number;
  explanation: string;
  breakdown: MatchBreakdown;
  matchedSkills: string[];
  missingSkills: string[];
}

const asList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => asList(item));
  }

  if (value === null || value === undefined || value === "") {
    return [];
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((item) =>
      asList(item)
    );
  }

  return String(value)
    .split(/[,;\n]/)
    .flatMap((item) => item.split("|"))
    .map((item) => item.trim())
    .filter(Boolean);
};

function candidateProfile(parsed: CandidateProfile): CandidateProfileResult {
  return {
    name: parsed.full_name || "Unnamed applicant",
    professionalSummary: parsed.professional_summary,
    careerObjective: parsed.career_objective,
    technicalSkills: parsed.technical_skills,
    softSkills: parsed.soft_skills,
    workExperience: parsed.work_experience,
    education: parsed.education,
    certifications: parsed.certifications,
    projects: parsed.projects,
  };
}

function buildMatchingPrompt(
  job: JobDescription,
  analysis: JobAnalysis | null | undefined,
  parsed: CandidateProfile
): string {
  return `
You are an expert recruitment candidate-matching engine.
Evaluate the candidate against the job description and return ONLY valid JSON.

Return exactly this structure:
{
  "score": 0,
  "explanation": "A concise evidence-based explanation",
  "breakdown": {
    "requiredSkills": 0,
    "preferredSkills": 0,
    "education": 0,
    "experience": 0,
    "roleRelevance": 0
  },
  "matchedSkills": [],
  "missingSkills": []
}

Rules:
- Score the candidate only from the supplied profile and job data. Do not invent experience or skills.
- The score and every breakdown value must be an integer from 0 to 100.
- Use the breakdown to explain the score; the breakdown values are category scores, not required to add to 100.
- matchedSkills and missingSkills must contain concise skill names from the job requirements.
- Treat equivalent skill names and clearly equivalent experience as matches when supported by the profile.
- Keep the explanation concise and mention the strongest evidence and important gaps.

JOB DESCRIPTION:
${JSON.stringify(
  {
    title: job.title,
    department: job.department,
    experience: job.experience,
    education: job.education,
    requiredSkills: job.required_skills,
    preferredSkills: job.preferred_skills,
    responsibilities: job.responsibilities,
    summary: job.summary,
    keywords: job.keywords,
  },
  null,
  2
)}

AI JOB ANALYSIS:
${JSON.stringify(analysis || {}, null, 2)}

CANDIDATE PROFILE:
${JSON.stringify(candidateProfile(parsed), null, 2)}
`.trim();
}

function parseGeminiJSON(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  return JSON.parse(cleaned);
}

function normalizeMatch(match: unknown): CandidateMatch {
  const data =
    match && typeof match === "object"
      ? (match as Record<string, unknown>)
      : {};

  const breakdown =
    data.breakdown && typeof data.breakdown === "object"
      ? (data.breakdown as Record<string, unknown>)
      : {};

  const clamp = (value: unknown): number =>
    Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

  return {
    score: clamp(data.score),

    explanation: String(
      data.explanation || "Gemini did not provide an explanation."
    ),

    breakdown: {
      requiredSkills: clamp(breakdown.requiredSkills),
      preferredSkills: clamp(breakdown.preferredSkills),
      education: clamp(breakdown.education),
      experience: clamp(breakdown.experience),
      roleRelevance: clamp(breakdown.roleRelevance),
    },

    matchedSkills: asList(data.matchedSkills),
    missingSkills: asList(data.missingSkills),
  };
}

export async function scoreCandidateWithGemini(
  job: JobDescription,
  analysis: JobAnalysis | null | undefined,
  parsed: CandidateProfile
): Promise<CandidateMatch> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
  });

  let result:
    | Awaited<ReturnType<typeof model.generateContent>>
    | undefined;

  for (
    let attempt = 0;
    attempt <= MAX_GEMINI_RETRIES;
    attempt += 1
  ) {
    try {
      result = await model.generateContent(
        buildMatchingPrompt(job, analysis, parsed)
      );

      break;
    } catch (error: unknown) {
      const geminiError = error as GeminiError;
      const status = Number(geminiError?.status);

      if (
        !TRANSIENT_GEMINI_STATUSES.has(status) ||
        attempt === MAX_GEMINI_RETRIES
      ) {
        throw error;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * (attempt + 1))
      );
    }
  }

  if (!result) {
    throw new Error("Gemini did not return a result");
  }

  return normalizeMatch(parseGeminiJSON(result.response.text()));
}
