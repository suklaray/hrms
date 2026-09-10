import { GoogleGenerativeAI } from "@google/generative-ai";

const TRANSIENT_GEMINI_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_GEMINI_RETRIES = 2;

const asList = (value) => {
  if (Array.isArray(value)) return value.flatMap((item) => asList(item));
  if (value === null || value === undefined || value === "") return [];
  if (typeof value === "object") return Object.values(value).flatMap((item) => asList(item));
  return String(value).split(/[,;\n]/).flatMap((item) => item.split("|")).map((item) => item.trim()).filter(Boolean);
};

function candidateProfile(parsed) {
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

function buildMatchingPrompt(job, analysis, parsed) {
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
${JSON.stringify({
    title: job.title,
    department: job.department,
    experience: job.experience,
    education: job.education,
    requiredSkills: job.required_skills,
    preferredSkills: job.preferred_skills,
    responsibilities: job.responsibilities,
    summary: job.summary,
    keywords: job.keywords,
  }, null, 2)}

AI JOB ANALYSIS:
${JSON.stringify(analysis || {}, null, 2)}

CANDIDATE PROFILE:
${JSON.stringify(candidateProfile(parsed), null, 2)}
`.trim();
}

function parseGeminiJSON(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(cleaned);
}

function normalizeMatch(match) {
  const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  return {
    score: clamp(match.score),
    explanation: String(match.explanation || "Gemini did not provide an explanation."),
    breakdown: {
      requiredSkills: clamp(match.breakdown?.requiredSkills),
      preferredSkills: clamp(match.breakdown?.preferredSkills),
      education: clamp(match.breakdown?.education),
      experience: clamp(match.breakdown?.experience),
      roleRelevance: clamp(match.breakdown?.roleRelevance),
    },
    matchedSkills: asList(match.matchedSkills),
    missingSkills: asList(match.missingSkills),
  };
}

export async function scoreCandidateWithGemini(job, analysis, parsed) {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
  let result;

  for (let attempt = 0; attempt <= MAX_GEMINI_RETRIES; attempt += 1) {
    try {
      result = await model.generateContent(buildMatchingPrompt(job, analysis, parsed));
      break;
    } catch (error) {
      const status = Number(error?.status);
      if (!TRANSIENT_GEMINI_STATUSES.has(status) || attempt === MAX_GEMINI_RETRIES) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  return normalizeMatch(parseGeminiJSON(result.response.text()));
}