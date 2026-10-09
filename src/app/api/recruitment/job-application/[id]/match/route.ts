import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { runDetailedMatch } from "@/lib/candidateMatching/aiMatcher";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const REVIEW_SCORE_FIELDS = {
  skills: "skills_score",
  experience: "experience_score",
  education: "education_score",
  keywords: "keyword_score",
  location: "location_score",
  salary: "salary_score",
  noticePeriod: "notice_period_score",
  certifications: "certification_score",
  projectsDomain: "project_score",
} as const;

type ReviewCriterion = keyof typeof REVIEW_SCORE_FIELDS;

const isReviewCriterion = (value: unknown): value is ReviewCriterion =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(REVIEW_SCORE_FIELDS, value);

function getMatchingFailureMessage(error: unknown): string {
  const details = error instanceof Error ? error.message : String(error);
  const status =
    error && typeof error === "object" && "status" in error
      ? Number(error.status)
      : undefined;

  if (!process.env.GEMINI_API_KEY) {
    return "Candidate matching is unavailable because GEMINI_API_KEY is not configured.";
  }
  if (
    status === 429 ||
    /quota exceeded|quota.*limit|free.?tier.*requestsperday/i.test(details)
  ) {
    return "Gemini's request quota has been reached. The parsed resume is saved; retry matching after the quota resets.";
  }
  if (status === 503 || /high demand|service unavailable/i.test(details)) {
    return "Gemini is temporarily busy. The parsed resume is saved; retry matching shortly.";
  }
  return "Candidate comparison failed. The parsed resume is saved; retry matching.";
}

function serializeMatch(match: {
  final_score: unknown;
  ai_overall_score: unknown;
  skills_score: unknown;
  experience_score: unknown;
  education_score: unknown;
  keyword_score: unknown;
  certification_score: unknown;
  project_score: unknown;
  location_score: unknown;
  salary_score: unknown;
  notice_period_score: unknown;
  ai_recommendation: string | null;
  score_breakdown: unknown;
  recruiter_selected_criteria?: unknown;
  recruiter_reviewed_at?: Date | null;
}) {
  return {
    finalScore: Number(match.final_score ?? match.ai_overall_score ?? 0),
    skillsScore: Number(match.skills_score ?? 0),
    experienceScore: Number(match.experience_score ?? 0),
    educationScore: Number(match.education_score ?? 0),
    keywordScore: Number(match.keyword_score ?? 0),
    certificationScore: Number(match.certification_score ?? 0),
    projectScore: Number(match.project_score ?? 0),
    locationScore: Number(match.location_score ?? 0),
    salaryScore: Number(match.salary_score ?? 0),
    noticePeriodScore: Number(match.notice_period_score ?? 0),
    recommendation: match.ai_recommendation || "",
    breakdown: match.score_breakdown,
    recruiterSelectedCriteria: Array.isArray(match.recruiter_selected_criteria)
      ? match.recruiter_selected_criteria.filter(isReviewCriterion)
      : [],
    recruiterReviewedAt: match.recruiter_reviewed_at?.toISOString() || null,
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id: uid } = await params;

    const resume = await prisma.parsed_resumes.findUnique({
      where: { uid },
      include: { job_description: { include: { analysis: true } } },
    });

    if (!resume || resume.parsing_status !== "DONE") {
      return NextResponse.json(
        { success: false, error: "Parsed resume not found" },
        { status: 404 }
      );
    }
    if (!resume.job_description) {
      return NextResponse.json(
        { success: false, error: "This resume is not linked to a job description" },
        { status: 409 }
      );
    }

    const comparison = await prisma.candidate_job_matches.findFirst({
      where: {
        job_description_id: resume.job_description.id,
        parsed_resume_id: resume.id,
      },
    });

    return NextResponse.json({
      success: true,
      status: comparison?.processing_status || "PENDING",
      error: comparison?.processing_error || null,
      candidate: {
        id: resume.id,
        name: resume.full_name || "Unnamed applicant",
        email: resume.email || "No email",
        mobileNumber: resume.mobile_number,
        currentAddress: resume.current_address,
        city: resume.city,
        state: resume.state,
        country: resume.country,
        linkedin: resume.linkedin_profile,
        portfolio: resume.portfolio_url,
        github: resume.github_url,
        careerObjective: resume.career_objective,
        summary: resume.professional_summary,
        workExperience: resume.work_experience,
        education: resume.education,
        technicalSkills: resume.technical_skills,
        softSkills: resume.soft_skills,
        certifications: resume.certifications,
        languages: resume.languages_known,
        projects: resume.projects,
        awards: resume.awards_and_achievements,
        publications: resume.publications,
        training: resume.training,
        noticePeriod: resume.notice_period,
        currentSalary: resume.current_salary,
        expectedSalary: resume.expected_salary,
        preferredLocation: resume.preferred_location,
        parsedAt: resume.parsed_at,
      },
      job: resume.job_description,
      match: comparison?.processing_status === "COMPLETED" && comparison
        ? serializeMatch(comparison)
        : null,
    });
  } catch (error) {
    console.error("Candidate comparison details failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load candidate comparison" },
      { status: 500 }
    );
  }
}

export async function POST(_request: Request, { params }: RouteContext) {
  let comparisonId: number | null = null;

  try {
    const { id: uid } = await params;

    const resume = await prisma.parsed_resumes.findUnique({
      where: { uid },
      include: { job_description: { include: { analysis: true } } },
    });

    if (!resume || resume.parsing_status !== "DONE") {
      return NextResponse.json(
        { success: false, error: "Parsed resume not found" },
        { status: 404 }
      );
    }
    if (!resume.job_description) {
      return NextResponse.json(
        { success: false, error: "This resume is not linked to a job description" },
        { status: 409 }
      );
    }

    const existing = await prisma.candidate_job_matches.findFirst({
      where: {
        job_description_id: resume.job_description.id,
        parsed_resume_id: resume.id,
      },
      select: { id: true, processing_status: true },
    }) ?? await prisma.candidate_job_matches.create({
      data: {
        job_description_id: resume.job_description.id,
        parsed_resume_id: resume.id,
        processing_status: "PENDING",
      },
      select: { id: true, processing_status: true },
    });
    comparisonId = existing.id;

    if (existing.processing_status === "COMPLETED") {
      return NextResponse.json({ success: true, status: "COMPLETED" });
    }

    const claimed = await prisma.candidate_job_matches.updateMany({
      where: {
        id: existing.id,
        processing_status: { in: ["PENDING", "FAILED"] },
      },
      data: {
        processing_status: "PROCESSING",
        processing_error: null,
      },
    });

    if (claimed.count === 0) {
      const latest = await prisma.candidate_job_matches.findUnique({
        where: { id: existing.id },
        select: { processing_status: true },
      });
      return NextResponse.json({
        success: true,
        status: latest?.processing_status || "PROCESSING",
      });
    }

    const result = await runDetailedMatch(
      resume.job_description,
      resume.job_description.analysis,
      resume
    );
    const scoreBreakdown = JSON.parse(JSON.stringify(result.score_breakdown));

    await prisma.candidate_job_matches.update({
      where: { id: existing.id },
      data: {
        ai_match_score: result.ai_match_score,
        ai_overall_score: result.final_score,
        final_score: result.final_score,
        skills_score: result.skills_score,
        experience_score: result.experience_score,
        education_score: result.education_score,
        keyword_score: result.keyword_score,
        certification_score: result.certification_score,
        project_score: result.project_score,
        location_score: result.location_score,
        salary_score: result.salary_score,
        notice_period_score: result.notice_period_score,
        score_breakdown: scoreBreakdown,
        ai_recommendation: result.ai_recommendation,
        processing_status: "COMPLETED",
        processing_error: null,
        model_name: "gemini-3.8-flash",
        evaluated_at: new Date(),
      },
    });

    await prisma.parsed_resumes.update({
      where: { id: resume.id },
      data: { matching_score: result.final_score },
    });

    return NextResponse.json({ success: true, status: "COMPLETED" });
  } catch (error) {
    console.error("Detailed candidate match failed:", error);
    const message = getMatchingFailureMessage(error);

    if (comparisonId !== null) {
      await prisma.candidate_job_matches.update({
        where: { id: comparisonId },
        data: { processing_status: "FAILED", processing_error: message },
      });
    }

    return NextResponse.json(
      { success: false, status: "FAILED", error: message },
      { status: 502 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id: uid } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Request body must be valid JSON" },
        { status: 400 }
      );
    }

    const selectedValue =
      body && typeof body === "object" && "selectedCriteria" in body
        ? body.selectedCriteria
        : null;
    if (
      !Array.isArray(selectedValue) ||
      selectedValue.length === 0 ||
      !selectedValue.every(isReviewCriterion)
    ) {
      return NextResponse.json(
        { success: false, error: "Select at least one valid matching criterion" },
        { status: 400 }
      );
    }

    const selectedCriteria = (Object.keys(REVIEW_SCORE_FIELDS) as ReviewCriterion[]).filter((criterion) =>
      selectedValue.includes(criterion)
    ) as ReviewCriterion[];
    if (selectedCriteria.length !== selectedValue.length) {
      return NextResponse.json(
        { success: false, error: "Duplicate matching criteria are not allowed" },
        { status: 400 }
      );
    }

    const resume = await prisma.parsed_resumes.findUnique({
      where: { uid },
      select: { id: true, job_description_id: true },
    });

    if (!resume || !resume.job_description_id) {
      return NextResponse.json(
        { success: false, error: "Parsed resume is not linked to a job description" },
        { status: 404 }
      );
    }

    const comparison = await prisma.candidate_job_matches.findFirst({
      where: {
        job_description_id: resume.job_description_id,
        parsed_resume_id: resume.id,
      },
    });

    if (!comparison || comparison.processing_status !== "COMPLETED") {
      return NextResponse.json(
        { success: false, error: "Recruiter scoring is available after AI comparison completes" },
        { status: 409 }
      );
    }

    const scores: Record<ReviewCriterion, unknown> = {
      skills: comparison.skills_score,
      experience: comparison.experience_score,
      education: comparison.education_score,
      keywords: comparison.keyword_score,
      location: comparison.location_score,
      salary: comparison.salary_score,
      noticePeriod: comparison.notice_period_score,
      certifications: comparison.certification_score,
      projectsDomain: comparison.project_score,
    };
    const selectedScores = selectedCriteria.map((criterion) => Number(scores[criterion]));
    if (selectedScores.some((score) => !Number.isFinite(score) || score < 0 || score > 100)) {
      return NextResponse.json(
        { success: false, error: "One or more selected criteria scores are unavailable" },
        { status: 409 }
      );
    }

    const finalScore = Math.round(
      (selectedScores.reduce((total, score) => total + score, 0) / selectedScores.length) * 100
    ) / 100;
    const reviewedAt = new Date();
    const saved = await prisma.$transaction(async (transaction) => {
      const updatedComparison = await transaction.candidate_job_matches.update({
        where: { id: comparison.id },
        data: {
          final_score: finalScore,
          recruiter_selected_criteria: selectedCriteria,
          recruiter_reviewed_at: reviewedAt,
        },
        select: {
          final_score: true,
          recruiter_selected_criteria: true,
          recruiter_reviewed_at: true,
        },
      });
      await transaction.parsed_resumes.update({
        where: { id: resume.id },
        data: { matching_score: finalScore },
      });
      return updatedComparison;
    });

    return NextResponse.json({
      success: true,
      finalScore: Number(saved.final_score),
      selectedCriteria: saved.recruiter_selected_criteria,
      reviewedAt: saved.recruiter_reviewed_at?.toISOString() || null,
    });
  } catch (error) {
    console.error("Saving recruiter candidate score failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save recruiter score" },
      { status: 500 }
    );
  }
}
