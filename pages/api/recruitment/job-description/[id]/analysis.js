import prisma from "@/lib/prisma";

function mapAnalysisToDatabase(analysis) {
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

    mandatory_skills: skillsAnalysis.mandatorySkills,
    preferred_skills: skillsAnalysis.preferredSkills,
    soft_skills: skillsAnalysis.softSkills,

    technical_keywords: keywords.technical,
    functional_keywords: keywords.functional,
    industry_keywords: keywords.industry,
    role_keywords: keywords.roleBased,

    minimum_experience: experienceAnalysis.minimumExperience,
    maximum_experience: experienceAnalysis.maximumExperience,
    industry_experience: experienceAnalysis.industryExperience,
    domain_expertise: experienceAnalysis.domainExpertise,

    degree: educationAnalysis.degree,
    stream: educationAnalysis.stream,
    certifications: educationAnalysis.certifications,
    mandatory_certifications: educationAnalysis.mandatoryCertifications,
    preferred_certifications: educationAnalysis.preferredCertifications,

    primary_responsibilities: responsibilities.primary,
    secondary_responsibilities: responsibilities.secondary,
    leadership_responsibilities: responsibilities.leadership,

    quality_score: qualityScore.overall,
    completeness_score: qualityScore.completeness,
    readability_score: qualityScore.readability,
    ats_score: qualityScore.atsFriendliness,
    bias_free_score: qualityScore.biasFreeLanguage,
    keyword_score: qualityScore.keywordOptimization,

    missing_information: analysis.missingInformation,
    bias_detected: biasDetection.detected ?? false,
    bias_details: biasDetection.issues,
    inclusive_suggestions: biasDetection.issues,
    ats_suggestions: analysis.atsSuggestions,

    required_skills_weight: matchingCriteria.requiredSkillsWeight,
    experience_weight: matchingCriteria.experienceWeightage,
    education_weight: matchingCriteria.educationWeightage,
    certification_weight: matchingCriteria.certificationWeightage,
    matching_criteria: matchingCriteria,

    analysis_status: "COMPLETED",
    confidence_score: analysis.confidenceScore,
    ai_model: analysis.aiModel,
    analysis_error: analysis.analysisError,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const { id } = req.query;
  const { analysis } = req.body;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({
      success: false,
      error: "Invalid job description ID",
    });
  }

  if (!analysis) {
    return res.status(400).json({
      success: false,
      error: "Analysis data is required",
    });
  }

  try {
    const jobDescription = await prisma.job_descriptions.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!jobDescription) {
      return res.status(404).json({
        success: false,
        error: "Job description not found",
      });
    }

    const savedAnalysis = await prisma.job_description_analysis.upsert({
      where: {
        job_description_id: Number(id),
      },

      create: {
        job_description_id: Number(id),
        ...mapAnalysisToDatabase(analysis),
      },

      update: mapAnalysisToDatabase(analysis),
    });

    return res.status(200).json({
      success: true,
      message: "Job description analysis saved successfully",
      data: savedAnalysis,
    });

  } catch (error) {
    console.error("Save JD Analysis Error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to save job description analysis",
    });
  }
}