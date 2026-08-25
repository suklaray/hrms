import prisma from "@/lib/prisma";

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

        job_title: analysis.job_title,
        department: analysis.department,
        employment_type: analysis.employment_type,
        work_mode: analysis.work_mode,
        location: analysis.location,
        experience_required: analysis.experience_required,
        education: analysis.education,
        salary_min: analysis.salary_min,
        salary_max: analysis.salary_max,
        openings: analysis.openings,

        mandatory_skills: analysis.mandatory_skills,
        preferred_skills: analysis.preferred_skills,
        soft_skills: analysis.soft_skills,

        technical_keywords: analysis.technical_keywords,
        functional_keywords: analysis.functional_keywords,
        industry_keywords: analysis.industry_keywords,
        role_keywords: analysis.role_keywords,

        minimum_experience: analysis.minimum_experience,
        maximum_experience: analysis.maximum_experience,
        industry_experience: analysis.industry_experience,
        domain_expertise: analysis.domain_expertise,

        degree: analysis.degree,
        stream: analysis.stream,
        certifications: analysis.certifications,
        mandatory_certifications: analysis.mandatory_certifications,
        preferred_certifications: analysis.preferred_certifications,

        primary_responsibilities: analysis.primary_responsibilities,
        secondary_responsibilities: analysis.secondary_responsibilities,
        leadership_responsibilities: analysis.leadership_responsibilities,

        quality_score: analysis.quality_score,
        completeness_score: analysis.completeness_score,
        readability_score: analysis.readability_score,
        ats_score: analysis.ats_score,
        bias_free_score: analysis.bias_free_score,
        keyword_score: analysis.keyword_score,

        missing_information: analysis.missing_information,

        bias_detected: analysis.bias_detected ?? false,
        bias_details: analysis.bias_details,
        inclusive_suggestions: analysis.inclusive_suggestions,

        ats_suggestions: analysis.ats_suggestions,

        required_skills_weight: analysis.required_skills_weight,
        experience_weight: analysis.experience_weight,
        education_weight: analysis.education_weight,
        certification_weight: analysis.certification_weight,

        matching_criteria: analysis.matching_criteria,

        analysis_status: "COMPLETED",
        confidence_score: analysis.confidence_score,
        ai_model: analysis.ai_model,
        analysis_error: analysis.analysis_error,
      },

      update: {
        job_title: analysis.job_title,
        department: analysis.department,
        employment_type: analysis.employment_type,
        work_mode: analysis.work_mode,
        location: analysis.location,
        experience_required: analysis.experience_required,
        education: analysis.education,
        salary_min: analysis.salary_min,
        salary_max: analysis.salary_max,
        openings: analysis.openings,

        mandatory_skills: analysis.mandatory_skills,
        preferred_skills: analysis.preferred_skills,
        soft_skills: analysis.soft_skills,

        technical_keywords: analysis.technical_keywords,
        functional_keywords: analysis.functional_keywords,
        industry_keywords: analysis.industry_keywords,
        role_keywords: analysis.role_keywords,

        minimum_experience: analysis.minimum_experience,
        maximum_experience: analysis.maximum_experience,
        industry_experience: analysis.industry_experience,
        domain_expertise: analysis.domain_expertise,

        degree: analysis.degree,
        stream: analysis.stream,
        certifications: analysis.certifications,
        mandatory_certifications: analysis.mandatory_certifications,
        preferred_certifications: analysis.preferred_certifications,

        primary_responsibilities: analysis.primary_responsibilities,
        secondary_responsibilities: analysis.secondary_responsibilities,
        leadership_responsibilities: analysis.leadership_responsibilities,

        quality_score: analysis.quality_score,
        completeness_score: analysis.completeness_score,
        readability_score: analysis.readability_score,
        ats_score: analysis.ats_score,
        bias_free_score: analysis.bias_free_score,
        keyword_score: analysis.keyword_score,

        missing_information: analysis.missing_information,

        bias_detected: analysis.bias_detected ?? false,
        bias_details: analysis.bias_details,
        inclusive_suggestions: analysis.inclusive_suggestions,

        ats_suggestions: analysis.ats_suggestions,

        required_skills_weight: analysis.required_skills_weight,
        experience_weight: analysis.experience_weight,
        education_weight: analysis.education_weight,
        certification_weight: analysis.certification_weight,

        matching_criteria: analysis.matching_criteria,

        analysis_status: "COMPLETED",
        confidence_score: analysis.confidence_score,
        ai_model: analysis.ai_model,
        analysis_error: analysis.analysis_error,
      },
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