import { GoogleGenerativeAI } from '@google/generative-ai';

const EMPTY_STRUCTURE = {
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

const PROMPT_TEMPLATE = (resumeText) => `
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

function normalizeStructure(parsed) {
  const base = JSON.parse(JSON.stringify(EMPTY_STRUCTURE));

  // Merge top-level keys only from the predefined structure
  for (const key of Object.keys(base)) {
    if (parsed[key] !== undefined) {
      if (Array.isArray(base[key])) {
        base[key] = Array.isArray(parsed[key]) ? parsed[key] : [];
      } else if (typeof base[key] === 'object' && base[key] !== null) {
        base[key] = { ...base[key], ...parsed[key] };
      } else {
        base[key] = parsed[key];
      }
    }
  }

  return base;
}

/**
 * Send extracted resume text to Gemini and return structured JSON.
 * @param {string} resumeText
 * @returns {Promise<object>} structured candidate data
 */
export async function parseResumeWithGemini(resumeText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

  const prompt = PROMPT_TEMPLATE(resumeText);
  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();

  // Strip markdown code fences if Gemini wraps the response
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Gemini returned invalid JSON. Please try again.');
  }

  return normalizeStructure(parsed);
}
