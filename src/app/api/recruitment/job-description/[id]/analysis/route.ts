//C:\OfficeWork\hrms\pages\api\recruitment\job-description\[id]\analysis.js
//src/app/api/recruitment/job-description/[id]/analysis/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

interface AnalysisData {
  jobInformation?: {
    jobTitle?: string;
    department?: string;
    employmentType?: string;
    workMode?: string;
    location?: string;
    minimumExperience?: string;
    educationQualification?: string;
    salaryMinimum?: string;
    salaryMaximum?: string;
    openings?: number;
  };

  skillsAnalysis?: {
    mandatorySkills?: unknown;
    preferredSkills?: unknown;
    softSkills?: unknown;
  };

  keywords?: {
    technical?: unknown;
    functional?: unknown;
    industry?: unknown;
    roleBased?: unknown;
  };

  experienceAnalysis?: {
    minimumExperience?: string;
    maximumExperience?: string;
    industryExperience?: unknown;
    domainExpertise?: unknown;
  };

  educationAnalysis?: {
    degree?: unknown;
    stream?: unknown;
    certifications?: unknown;
    mandatoryCertifications?: unknown;
    preferredCertifications?: unknown;
  };

  responsibilities?: {
    primary?: unknown;
    secondary?: unknown;
    leadership?: unknown;
  };

  qualityScore?: {
    overall?: number;
    completeness?: number;
    readability?: number;
    atsFriendliness?: number;
    biasFreeLanguage?: number;
    keywordOptimization?: number;
  };

  biasDetection?: {
    detected?: boolean;
    issues?: unknown;
  };

  matchingCriteria?: {
    requiredSkillsWeight?: number;
    experienceWeightage?: number;
    educationWeightage?: number;
    certificationWeightage?: number;
    [key: string]: unknown;
  };

  missingInformation?: unknown;
  atsSuggestions?: unknown;
  confidenceScore?: number;
  aiModel?: string;
  analysisError?: string;
}

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

function toPrismaJson(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function mapAnalysisToDatabase(analysis: AnalysisData) {
  const jobInformation = analysis.jobInformation || {};
  const skillsAnalysis = analysis.skillsAnalysis || {};
  const keywords = analysis.keywords || {};
  const experienceAnalysis = analysis.experienceAnalysis || {};
  const educationAnalysis = analysis.educationAnalysis || {};
  const responsibilities = analysis.responsibilities || {};
  const qualityScore = analysis.qualityScore || {};
  const biasDetection = analysis.biasDetection || {};
  const matchingCriteria = analysis.matchingCriteria || {};

  return {
    job_title: jobInformation.jobTitle,
    department: jobInformation.department,
    employment_type: jobInformation.employmentType,
    work_mode: jobInformation.workMode,
    location: jobInformation.location,
    experience_required: jobInformation.minimumExperience,
    education: jobInformation.educationQualification,
    salary_min: jobInformation.salaryMinimum,
    salary_max: jobInformation.salaryMaximum,
    openings: jobInformation.openings,

    mandatory_skills: toPrismaJson(skillsAnalysis.mandatorySkills),
    preferred_skills: toPrismaJson(skillsAnalysis.preferredSkills),
    soft_skills: toPrismaJson(skillsAnalysis.softSkills),

    technical_keywords: toPrismaJson(keywords.technical),
    functional_keywords: toPrismaJson(keywords.functional),
    industry_keywords: toPrismaJson(keywords.industry),
    role_keywords: toPrismaJson(keywords.roleBased),

    minimum_experience: experienceAnalysis.minimumExperience,
    maximum_experience: experienceAnalysis.maximumExperience,
    industry_experience: toPrismaJson(experienceAnalysis.industryExperience),
    domain_expertise: toPrismaJson(experienceAnalysis.domainExpertise),

    degree: toPrismaJson(educationAnalysis.degree),
    stream: toPrismaJson(educationAnalysis.stream),
    certifications: toPrismaJson(educationAnalysis.certifications),
    mandatory_certifications: toPrismaJson(educationAnalysis.mandatoryCertifications),
    preferred_certifications: toPrismaJson(educationAnalysis.preferredCertifications),

    primary_responsibilities: toPrismaJson(responsibilities.primary),
    secondary_responsibilities: toPrismaJson(responsibilities.secondary),
    leadership_responsibilities: toPrismaJson(responsibilities.leadership),

    quality_score: qualityScore.overall,
    completeness_score: qualityScore.completeness,
    readability_score: qualityScore.readability,
    ats_score: qualityScore.atsFriendliness,
    bias_free_score: qualityScore.biasFreeLanguage,
    keyword_score: qualityScore.keywordOptimization,

    missing_information: toPrismaJson(analysis.missingInformation),
    bias_detected: biasDetection.detected ?? false,
    bias_details: toPrismaJson(biasDetection.issues),
    inclusive_suggestions: toPrismaJson(biasDetection.issues),
    ats_suggestions: toPrismaJson(analysis.atsSuggestions),

    required_skills_weight: matchingCriteria.requiredSkillsWeight,
    experience_weight: matchingCriteria.experienceWeightage,
    education_weight: matchingCriteria.educationWeightage,
    certification_weight: matchingCriteria.certificationWeightage,
    matching_criteria: toPrismaJson(matchingCriteria),

    analysis_status: "COMPLETED",
    confidence_score: analysis.confidenceScore,
    ai_model: analysis.aiModel,
    analysis_error: analysis.analysisError,
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const jobDescriptionId = Number(id);

    if (!id || Number.isNaN(jobDescriptionId)) {
      return NextResponse.json({ success: false, error: "Invalid job description ID" }, { status: 400 });
    }

    const analysis = await prisma.job_description_analysis.findUnique({
      where: { job_description_id: jobDescriptionId },
    });

    if (!analysis) {
      return NextResponse.json({ success: false, error: "No analysis found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: analysis }, { status: 200 });
  } catch (error: unknown) {
    console.error("Get JD Analysis Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch analysis" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const jobDescriptionId = Number(id);

    if (!id || Number.isNaN(jobDescriptionId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid job description ID",
        },
        { status: 400 }
      );
    }

    const body = (await request.json()) as {
      analysis?: AnalysisData;
    };

    const { analysis } = body;

    if (!analysis) {
      return NextResponse.json(
        {
          success: false,
          error: "Analysis data is required",
        },
        { status: 400 }
      );
    }

    const jobDescription = await prisma.job_descriptions.findUnique({
      where: {
        id: jobDescriptionId,
      },
    });

    if (!jobDescription) {
      return NextResponse.json(
        {
          success: false,
          error: "Job description not found",
        },
        { status: 404 }
      );
    }

    const mappedAnalysis = mapAnalysisToDatabase(analysis);

    const savedAnalysis = await prisma.job_description_analysis.upsert({
      where: {
        job_description_id: jobDescriptionId,
      },

      create: {
        ...mappedAnalysis,
        job_description: {
          connect: {
            id: jobDescriptionId,
          },
        },
      },

      update: mappedAnalysis,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Job description analysis saved successfully",
        data: savedAnalysis,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Save JD Analysis Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save job description analysis",
      },
      { status: 500 }
    );
  }
}
