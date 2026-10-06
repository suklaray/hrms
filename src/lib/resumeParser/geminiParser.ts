//lib/resumeParser/geminiParser.ts

import { GoogleGenerativeAI } from "@google/generative-ai";

const TRANSIENT_GEMINI_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_GEMINI_RETRIES = 2;

interface GeminiError extends Error {
  status?: number;
}

interface PersonalInformation {
  fullName: string | null;
  emailAddress: string | null;
  mobileNumber: string | null;
  alternatePhoneNumber: string | null;
  currentAddress: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  linkedInProfile: string | null;
  portfolioUrl: string | null;
  githubUrl: string | null;
}

interface ProfessionalInformation {
  careerObjective: string | null;
  professionalSummary: string | null;
}

interface WorkExperience {
  companyName: string | null;
  jobTitle: string | null;
  employmentType: string | null;
  startDate: string | null;
  endDate: string | null;
  totalDuration: string | null;
  currentEmployer: boolean;
  responsibilities: string[];
}

interface Education {
  degree: string | null;
  specialization: string | null;
  institutionName: string | null;
  university: string | null;
  graduationYear: string | null;
  percentage: string | null;
  cgpa: string | null;
}

interface Skills {
  technicalSkills: string[];
  softSkills: string[];
}

interface AdditionalInformation {
  noticePeriod: string | null;
  currentSalary: string | null;
  expectedSalary: string | null;
  preferredLocation: string | null;
}

export interface ParsedResume {
  personalInformation: PersonalInformation;
  professionalInformation: ProfessionalInformation;
  workExperience: WorkExperience[];
  education: Education[];
  skills: Skills;
  certifications: unknown[];
  languagesKnown: unknown[];
  projects: unknown[];
  awardsAndAchievements: unknown[];
  publications: unknown[];
  training: unknown[];
  additionalInformation: AdditionalInformation;
}

const EMPTY_STRUCTURE: ParsedResume = {
  personalInformation: {
    fullName: null,
    emailAddress: null,
    mobileNumber: null,
    alternatePhoneNumber: null,
    currentAddress: null,
    city: null,
    state: null,
    country: null,
    linkedInProfile: null,
    portfolioUrl: null,
    githubUrl: null,
  },

  professionalInformation: {
    careerObjective: null,
    professionalSummary: null,
  },

  workExperience: [],

  education: [],

  skills: {
    technicalSkills: [],
    softSkills: [],
  },

  certifications: [],

  languagesKnown: [],

  projects: [],

  awardsAndAchievements: [],

  publications: [],

  training: [],

  additionalInformation: {
    noticePeriod: null,
    currentSalary: null,
    expectedSalary: null,
    preferredLocation: null,
  },
};

const PROMPT_TEMPLATE = (
  resumeText: string
): string => `
You are a resume parser. Extract structured information from the resume text below.

RULES:
1. Extract ONLY information actually present in the resume. Never invent or guess.
2. If a field is not present, return null for scalar fields.
3. For array fields (skills, experience, education, projects, etc.), return [] when no data is available.
4. Preserve the original meaning. Normalize dates to "MMM YYYY" format where possible (e.g. "Jan 2020").
5. Return ONLY valid JSON. No markdown, no code blocks, no explanation.
6. Follow the exact structure provided below. Do not add or remove any fields.
7. Do not create duplicate entries in any array.
8. For workExperience, set currentEmployer: true only if the candidate is currently working there.

REQUIRED OUTPUT STRUCTURE:
${JSON.stringify(EMPTY_STRUCTURE, null, 2)}

workExperience array items must follow:
{
  "companyName": null,
  "jobTitle": null,
  "employmentType": null,
  "startDate": null,
  "endDate": null,
  "totalDuration": null,
  "currentEmployer": false,
  "responsibilities": []
}

education array items must follow:
{
  "degree": null,
  "specialization": null,
  "institutionName": null,
  "university": null,
  "graduationYear": null,
  "percentage": null,
  "cgpa": null
}

RESUME TEXT:
---
${resumeText}
---

Return only the JSON object. No other text.
`;

function normalizeStructure(
  parsed: Partial<ParsedResume>
): ParsedResume {
  const base: ParsedResume = JSON.parse(
    JSON.stringify(EMPTY_STRUCTURE)
  );

  // Merge top-level keys only from the predefined structure
  for (const key of Object.keys(base) as Array<
    keyof ParsedResume
  >) {
    if (parsed[key] !== undefined) {
      const baseValue = base[key];
      const parsedValue = parsed[key];

      if (Array.isArray(baseValue)) {
        (
          base as unknown as Record<string, unknown>
        )[key] = Array.isArray(parsedValue)
          ? parsedValue
          : [];
      } else if (
        typeof baseValue === "object" &&
        baseValue !== null
      ) {
        (
          base as unknown as Record<string, unknown>
        )[key] = {
          ...baseValue,
          ...(parsedValue &&
          typeof parsedValue === "object"
            ? parsedValue
            : {}),
        };
      } else {
        (
          base as unknown as Record<string, unknown>
        )[key] = parsedValue;
      }
    }
  }

  return base;
}

export async function parseResumeWithGemini(
  resumeText: string
): Promise<ParsedResume> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
  });

  const prompt = PROMPT_TEMPLATE(resumeText);

  let result:
    | Awaited<ReturnType<typeof model.generateContent>>
    | undefined;

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
      const message = error instanceof Error ? error.message : String(error);
      const quotaExceeded =
        /quota exceeded|quota.*limit|free.?tier.*requestsperday/i.test(message);

      if (
        !TRANSIENT_GEMINI_STATUSES.has(status) ||
        quotaExceeded ||
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

  const raw = result.response.text().trim();

  // Strip markdown code fences if Gemini wraps the response
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      "Gemini returned invalid JSON. Please try again."
    );
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      "Gemini returned an invalid resume structure."
    );
  }

  return normalizeStructure(
    parsed as Partial<ParsedResume>
  );
}
