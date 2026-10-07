import { GoogleGenerativeAI } from "@google/generative-ai";

const MAX_RETRIES = 2;
const TRANSIENT = new Set([429, 500, 502, 503, 504]);

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
  location?: string;
  employment_type?: string;
  work_mode?: string;
  salary_min?: string | null;
  salary_max?: string | null;
}

interface JobAnalysis {
  mandatory_skills?: unknown;
  preferred_skills?: unknown;
  soft_skills?: unknown;
  technical_keywords?: unknown;
  functional_keywords?: unknown;
  industry_keywords?: unknown;
  role_keywords?: unknown;
  minimum_experience?: string;
  maximum_experience?: string;
  mandatory_certifications?: unknown;
  preferred_certifications?: unknown;
  degree?: unknown;
  stream?: unknown;
  domain_expertise?: unknown;
  [key: string]: unknown;
}

interface CandidateProfile {
  full_name?: string | null;
  professional_summary?: string | null;
  career_objective?: string | null;
  technical_skills?: unknown;
  soft_skills?: unknown;
  work_experience?: unknown;
  education?: unknown;
  certifications?: unknown;
  projects?: unknown;
  languages_known?: unknown;
  notice_period?: string | null;
  current_salary?: string | null;
  expected_salary?: string | null;
  preferred_location?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

export interface SkillsMatchDetail {
  matched: string[];
  missing: string[];
  additional: string[];
  score: number;
}

export interface ExperienceMatchDetail {
  required: string;
  candidate: string;
  score: number;
  notes: string;
}

export interface EducationMatchDetail {
  score: number;
  notes: string;
}

export interface KeywordMatchDetail {
  matched: string[];
  missing: string[];
  score: number;
  percentage: number;
}

export interface LocationMatchDetail {
  job_location: string;
  candidate_location: string;
  score: number;
  notes: string;
}

export interface SalaryMatchDetail {
  budget_range: string;
  expected: string;
  score: number;
  notes: string;
}

export interface NoticePeriodMatchDetail {
  candidate_notice: string;
  score: number;
  notes: string;
}

export interface CertificationMatchDetail {
  matched: string[];
  missing: string[];
  score: number;
}

export interface ProjectDomainMatchDetail {
  score: number;
  notes: string;
}

export interface MatchBreakdown {
  skills: SkillsMatchDetail;
  experience: ExperienceMatchDetail;
  education: EducationMatchDetail;
  keywords: KeywordMatchDetail;
  location: LocationMatchDetail;
  salary: SalaryMatchDetail;
  notice_period: NoticePeriodMatchDetail;
  certifications: CertificationMatchDetail;
  projects_domain: ProjectDomainMatchDetail;
}

export interface DetailedMatchResult {
  final_score: number;
  ai_match_score: number;
  skills_score: number;
  experience_score: number;
  education_score: number;
  keyword_score: number;
  location_score: number;
  salary_score: number;
  notice_period_score: number;
  certification_score: number;
  project_score: number;
  ai_recommendation: string;
  score_breakdown: MatchBreakdown;
}

function buildPrompt(
  job: JobDescription,
  analysis: JobAnalysis | null | undefined,
  candidate: CandidateProfile
): string {
  return `
You are an expert AI recruitment matching engine. Evaluate the candidate against the job description and return ONLY valid JSON.

Return exactly this JSON structure (all scores 0-100 integers):
{
  "final_score": 0,
  "ai_match_score": 0,
  "skills_score": 0,
  "experience_score": 0,
  "education_score": 0,
  "keyword_score": 0,
  "location_score": 0,
  "salary_score": 0,
  "notice_period_score": 0,
  "certification_score": 0,
  "project_score": 0,
  "ai_recommendation": "concise overall recommendation",
  "score_breakdown": {
    "skills": {
      "matched": ["skill1", "skill2"],
      "missing": ["skill3"],
      "additional": ["skill4"],
      "score": 0
    },
    "experience": {
      "required": "5 years",
      "candidate": "6 years",
      "score": 0,
      "notes": "brief note"
    },
    "education": {
      "score": 0,
      "notes": "brief note"
    },
    "keywords": {
      "matched": ["kw1"],
      "missing": ["kw2"],
      "score": 0,
      "percentage": 0
    },
    "location": {
      "job_location": "",
      "candidate_location": "",
      "score": 0,
      "notes": "brief note"
    },
    "salary": {
      "budget_range": "",
      "expected": "",
      "score": 0,
      "notes": "brief note"
    },
    "notice_period": {
      "candidate_notice": "",
      "score": 0,
      "notes": "brief note"
    },
    "certifications": {
      "matched": [],
      "missing": [],
      "score": 0
    },
    "projects_domain": {
      "score": 0,
      "notes": "brief note"
    }
  }
}

Scoring weights:
- Skills (mandatory+preferred+technical+soft): 30%
- Experience (total, relevant, seniority): 25%
- Education (degree, stream, certifications): 15%
- Keywords (ATS, technical, domain, functional): 10%
- Projects & Domain: 8%
- Certifications: 5%
- Location: 4%
- Salary: 2%
- Notice Period: 1%

final_score = weighted average of all criteria scores.
If salary or notice period data is missing, score them 50 (neutral).
If location is remote-eligible, score location 90+.

JOB DESCRIPTION:
${JSON.stringify({
  title: job.title,
  department: job.department,
  experience: job.experience,
  education: job.education,
  required_skills: job.required_skills,
  preferred_skills: job.preferred_skills,
  responsibilities: job.responsibilities,
  summary: job.summary,
  keywords: job.keywords,
  location: job.location,
  employment_type: job.employment_type,
  work_mode: job.work_mode,
  salary_min: job.salary_min,
  salary_max: job.salary_max,
}, null, 2)}

JD ANALYSIS:
${JSON.stringify(analysis || {}, null, 2)}

CANDIDATE PROFILE:
${JSON.stringify({
  name: candidate.full_name,
  summary: candidate.professional_summary,
  objective: candidate.career_objective,
  technical_skills: candidate.technical_skills,
  soft_skills: candidate.soft_skills,
  work_experience: candidate.work_experience,
  education: candidate.education,
  certifications: candidate.certifications,
  projects: candidate.projects,
  languages: candidate.languages_known,
  notice_period: candidate.notice_period,
  current_salary: candidate.current_salary,
  expected_salary: candidate.expected_salary,
  preferred_location: candidate.preferred_location,
  location: [candidate.city, candidate.state, candidate.country].filter(Boolean).join(", "),
}, null, 2)}
`.trim();
}

function parseJSON(text: string): unknown {
  return JSON.parse(
    text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()
  );
}

function clamp(v: unknown): number {
  return Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
}

function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (!v) return [];
  return String(v).split(/[,;]/).map(s => s.trim()).filter(Boolean);
}

function normalize(raw: unknown): DetailedMatchResult {
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const sb = (d.score_breakdown && typeof d.score_breakdown === "object"
    ? d.score_breakdown
    : {}) as Record<string, unknown>;

  const g = (key: string) => (sb[key] && typeof sb[key] === "object" ? sb[key] as Record<string, unknown> : {});

  const skills = g("skills");
  const experience = g("experience");
  const education = g("education");
  const keywords = g("keywords");
  const location = g("location");
  const salary = g("salary");
  const notice = g("notice_period");
  const certs = g("certifications");
  const projects = g("projects_domain");

  return {
    final_score: clamp(d.final_score),
    ai_match_score: clamp(d.ai_match_score),
    skills_score: clamp(d.skills_score),
    experience_score: clamp(d.experience_score),
    education_score: clamp(d.education_score),
    keyword_score: clamp(d.keyword_score),
    location_score: clamp(d.location_score),
    salary_score: clamp(d.salary_score),
    notice_period_score: clamp(d.notice_period_score),
    certification_score: clamp(d.certification_score),
    project_score: clamp(d.project_score),
    ai_recommendation: String(d.ai_recommendation || ""),
    score_breakdown: {
      skills: {
        matched: asList(skills.matched),
        missing: asList(skills.missing),
        additional: asList(skills.additional),
        score: clamp(skills.score),
      },
      experience: {
        required: String(experience.required || ""),
        candidate: String(experience.candidate || ""),
        score: clamp(experience.score),
        notes: String(experience.notes || ""),
      },
      education: {
        score: clamp(education.score),
        notes: String(education.notes || ""),
      },
      keywords: {
        matched: asList(keywords.matched),
        missing: asList(keywords.missing),
        score: clamp(keywords.score),
        percentage: clamp(keywords.percentage),
      },
      location: {
        job_location: String(location.job_location || ""),
        candidate_location: String(location.candidate_location || ""),
        score: clamp(location.score),
        notes: String(location.notes || ""),
      },
      salary: {
        budget_range: String(salary.budget_range || ""),
        expected: String(salary.expected || ""),
        score: clamp(salary.score),
        notes: String(salary.notes || ""),
      },
      notice_period: {
        candidate_notice: String(notice.candidate_notice || ""),
        score: clamp(notice.score),
        notes: String(notice.notes || ""),
      },
      certifications: {
        matched: asList(certs.matched),
        missing: asList(certs.missing),
        score: clamp(certs.score),
      },
      projects_domain: {
        score: clamp(projects.score),
        notes: String(projects.notes || ""),
      },
    },
  };
}

export async function runDetailedMatch(
  job: JobDescription,
  analysis: JobAnalysis | null | undefined,
  candidate: CandidateProfile
): Promise<DetailedMatchResult> {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });
  const prompt = buildPrompt(job, analysis, candidate);

  let result: Awaited<ReturnType<typeof model.generateContent>> | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      result = await model.generateContent(prompt);
      break;
    } catch (err: unknown) {
      const status = Number((err as { status?: number })?.status);
      const message = err instanceof Error ? err.message : String(err);
      const quotaExceeded =
        /quota exceeded|quota.*limit|free.?tier.*requestsperday/i.test(message);
      if (
        !TRANSIENT.has(status) ||
        quotaExceeded ||
        attempt === MAX_RETRIES
      ) {
        throw err;
      }
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  if (!result) throw new Error("Gemini returned no result");
  return normalize(parseJSON(result.response.text()));
}
