import { GoogleGenerativeAI } from "@google/generative-ai";
import { EMPTY_JD_ANALYSIS } from "./schema";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function analyzeJD(jobDescription) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const jdText = buildJDText(jobDescription);

  const prompt = `
You are an expert HR recruitment and ATS Job Description analysis engine.

Analyze the following Job Description and return ONLY valid JSON.

Do not return:
- Markdown
- Code fences
- Explanations
- Comments
- Extra text outside JSON

Your response MUST follow exactly this structure:

${JSON.stringify(EMPTY_JD_ANALYSIS, null, 2)}

IMPORTANT RULES:

1. Extract information only from the provided Job Description.
2. Do not invent information.
3. If information is not available, use:
   - "" for strings
   - [] for arrays
   - 0 for numeric scores
   - false for boolean values
4. Distinguish mandatory skills from preferred/nice-to-have skills.
5. Identify technical, functional, industry and role-based ATS keywords.
6. Identify minimum and maximum experience separately.
7. Identify relevant industry experience and domain expertise.
8. Identify degree, stream and certifications.
9. Categorize responsibilities into primary, secondary and leadership responsibilities.
10. Calculate the Job Quality Score from 0 to 100.
11. Detect missing JD information.
12. Detect potentially biased language.
13. For bias issues, provide the problematic language and an inclusive alternative.
14. Provide practical ATS optimization suggestions.
15. Generate candidate matching criteria suitable for a resume matching engine.
16. Weightages must be numbers from 0 to 100.
17. The three matching weightages should normally add up to 100.
18. Do not confuse a job requirement with something merely mentioned as an example.
19. Preserve the actual meaning of the JD.

QUALITY SCORE:

overall:
Overall quality of the JD from 0-100.

completeness:
How complete the JD information is.

readability:
How clear and readable the JD is.

atsFriendliness:
How suitable the JD is for ATS processing.

biasFreeLanguage:
How inclusive and unbiased the language is.

keywordOptimization:
How well the JD contains useful searchable keywords.

BIAS DETECTION:

Check for:
- Gender bias
- Age bias
- Cultural bias
- Discriminatory language
- Unnecessarily exclusionary language

If no bias is detected:

{
  "detected": false,
  "issues": []
}

If bias exists, include useful structured issues.

MATCHING CRITERIA:

Generate:
- Required skills
- Nice-to-have skills
- Experience weightage
- Education weightage
- Certification weightage

JOB DESCRIPTION:

${jdText}
`;

  try {
    const result = await model.generateContent(prompt);

    const response = result.response;
    const text = response.text();

    const analysis = parseGeminiJSON(text);

    return normalizeAnalysis(analysis);
  } catch (error) {
    console.error("Gemini JD analysis failed:", error);
    throw new Error("Failed to analyze Job Description with Gemini");
  }
}


/**
 * Convert the database Job Description into text
 * that Gemini can understand.
 */
function buildJDText(jd) {
  return `
Job Title:
${jd.title || ""}

Department:
${jd.department || ""}

Employment Type:
${jd.employment_type || ""}

Work Mode:
${jd.work_mode || ""}

Location:
${jd.location || ""}

Number of Openings:
${jd.openings ?? ""}

Experience Required:
${jd.experience || ""}

Education:
${jd.education || ""}

Required Skills:
${jd.required_skills || ""}

Preferred Skills:
${jd.preferred_skills || ""}

Responsibilities:
${jd.responsibilities || ""}

Job Summary:
${jd.summary || ""}

Salary Minimum:
${jd.salary_min || ""}

Salary Maximum:
${jd.salary_max || ""}

Benefits:
${jd.benefits || ""}

Deadline:
${jd.deadline || ""}

Hiring Manager:
${jd.hiring_manager || ""}

Interview Process:
${jd.interview_process || ""}

Existing Keywords:
${jd.keywords || ""}
`.trim();
}


/**
 * Gemini sometimes returns JSON inside ```json ... ```
 * Remove that before parsing.
 */
function parseGeminiJSON(text) {
  let cleaned = text.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Invalid Gemini JSON:", cleaned);

    throw new Error("Gemini returned invalid JSON");
  }
}


/**
 * Make sure Gemini cannot break your application's
 * expected response structure.
 */
function normalizeAnalysis(data) {
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