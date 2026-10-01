//C:\OfficeWork\hrms\lib\jd-analysis\analyzeJD.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { EMPTY_JD_ANALYSIS, JDAnalysis } from "./schema";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const TRANSIENT_GEMINI_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_GEMINI_RETRIES = 2;

interface JobDescription {
  title?: string;
  department?: string;
  employment_type?: string;
  work_mode?: string;
  location?: string;
  openings?: number;
  experience?: string;
  education?: string;
  required_skills?: string;
  preferred_skills?: string;
  responsibilities?: string;
  summary?: string;
  salary_minimum?: number | string | null;
  salary_maximum?: number | string | null;
  benefits?: string;
  deadline?: Date | string | null;
  hiring_manager?: string;
  interview_process?: string;
  keywords?: string;
}

interface GeminiError extends Error {
  status?: number;
}

type RawJDAnalysis = Partial<JDAnalysis>;

export default async function analyzeJD(
  jobDescription: JobDescription
): Promise<JDAnalysis> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
  });

  const jdText = buildJDText(jobDescription);

  const prompt = `
You are an expert HR and recruitment analyst.

Analyze the following Job Description and return ONLY valid JSON.

Use this exact structure as the response format:

${JSON.stringify(EMPTY_JD_ANALYSIS, null, 2)}

Important instructions:
- Do not return markdown.
- Do not wrap the JSON in \`\`\`json.
- Return only the JSON object.
- Keep arrays as arrays.
- Do not invent information that is not present in the Job Description.
- If information is missing, use the appropriate empty value from the structure.
- Analyze the job title, department, employment type, work mode, location, experience, education, salary, openings, skills, responsibilities, keywords, quality, missing information, bias and ATS optimization.
- Identify mandatory skills separately from preferred skills.
- Identify technical, functional, industry and role-based keywords.
- Identify primary, secondary and leadership responsibilities.
- Identify potential bias in the language and provide inclusive alternatives where applicable.
- Provide useful ATS suggestions.
- Calculate reasonable quality scores based only on the provided JD.
- Matching criteria should reflect the relative importance of required skills, experience, education and certifications.

Job Description:

${jdText}
`;

  try {
    let result: Awaited<ReturnType<typeof model.generateContent>> | undefined;

    for (
      let attempt = 0;
      attempt <= MAX_GEMINI_RETRIES;
      attempt += 1
    ) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (error: unknown) {
        const geminiError = error as GeminiError;
        const status = Number(geminiError?.status);

        const canRetry =
          TRANSIENT_GEMINI_STATUSES.has(status) &&
          attempt < MAX_GEMINI_RETRIES;

        if (!canRetry) {
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

    const response = result.response;
    const text = response.text();

    const analysis = parseGeminiJSON(text);

    return normalizeAnalysis(analysis);
  } catch (error: unknown) {
    console.error("Gemini JD analysis failed:", error);

    const geminiError = error as GeminiError;

    const analysisError = new Error(
      "Failed to analyze Job Description with Gemini"
    ) as GeminiError;

    analysisError.status = Number(geminiError?.status) || 500;

    throw analysisError;
  }
}

function buildJDText(jd: JobDescription): string {
  return `
Job Title: ${jd.title || ""}
Department: ${jd.department || ""}
Employment Type: ${jd.employment_type || ""}
Work Mode: ${jd.work_mode || ""}
Location: ${jd.location || ""}
Number of Openings: ${jd.openings ?? ""}
Experience: ${jd.experience || ""}
Education: ${jd.education || ""}
Required Skills: ${jd.required_skills || ""}
Preferred Skills: ${jd.preferred_skills || ""}
Responsibilities: ${jd.responsibilities || ""}
Job Summary: ${jd.summary || ""}
Salary Minimum: ${jd.salary_minimum ?? ""}
Salary Maximum: ${jd.salary_maximum ?? ""}
Benefits: ${jd.benefits || ""}
Application Deadline: ${jd.deadline || ""}
Hiring Manager: ${jd.hiring_manager || ""}
Interview Process: ${jd.interview_process || ""}
Keywords: ${jd.keywords || ""}
`;
}

function parseGeminiJSON(text: string): RawJDAnalysis {
  let cleaned = text.trim();

  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }

  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }

  cleaned = cleaned.trim();

  try {
    const parsed: unknown = JSON.parse(cleaned);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new Error("Gemini response is not a valid JSON object");
    }

    return parsed as RawJDAnalysis;
  } catch (error) {
    console.error("Invalid Gemini JSON:", text);

    throw new Error("Gemini returned invalid JSON");
  }
}

function normalizeAnalysis(data: Partial<JDAnalysis>): JDAnalysis {
  return {
    jobInformation: {
      ...EMPTY_JD_ANALYSIS.jobInformation,
      ...(data.jobInformation || {}),
    },

    skillsAnalysis: {
      ...EMPTY_JD_ANALYSIS.skillsAnalysis,
      ...(data.skillsAnalysis || {}),
    },

    keywords: {
      ...EMPTY_JD_ANALYSIS.keywords,
      ...(data.keywords || {}),
    },

    experienceAnalysis: {
      ...EMPTY_JD_ANALYSIS.experienceAnalysis,
      ...(data.experienceAnalysis || {}),
    },

    educationAnalysis: {
      ...EMPTY_JD_ANALYSIS.educationAnalysis,
      ...(data.educationAnalysis || {}),
    },

    responsibilities: {
      ...EMPTY_JD_ANALYSIS.responsibilities,
      ...(data.responsibilities || {}),
    },

    qualityScore: {
      ...EMPTY_JD_ANALYSIS.qualityScore,
      ...(data.qualityScore || {}),
    },

    missingInformation: Array.isArray(data.missingInformation)
      ? data.missingInformation
      : [],

    biasDetection: {
      ...EMPTY_JD_ANALYSIS.biasDetection,
      ...(data.biasDetection || {}),
    },

    atsSuggestions: Array.isArray(data.atsSuggestions)
      ? data.atsSuggestions
      : [],

    matchingCriteria: {
      ...EMPTY_JD_ANALYSIS.matchingCriteria,
      ...(data.matchingCriteria || {}),
    },
  };
}
