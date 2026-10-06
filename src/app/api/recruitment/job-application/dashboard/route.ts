import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const [resumes, jobs] = await Promise.all([
      prisma.parsed_resumes.findMany({
        where: { parsing_status: "DONE" },
        orderBy: { parsed_at: "desc" },
        include: {
          candidate: true,
          candidate_job_matches: {
            orderBy: { evaluated_at: "desc" },
            take: 1,
            select: {
              final_score: true,
              skills_score: true,
              experience_score: true,
              education_score: true,
              keyword_score: true,
              location_score: true,
              notice_period_score: true,
              salary_score: true,
              certification_score: true,
              project_score: true,
              processing_status: true,
              processing_error: true,
            },
          },
        },
      }),
      prisma.job_descriptions.findMany({
        where: { status: { not: "Closed" } },
        orderBy: { created_at: "desc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      resumes: resumes.map((resume) => {
        const comparison = resume.candidate_job_matches[0];
        const comparisonComplete = comparison?.processing_status === "COMPLETED";

        return ({
        id: resume.id,
        name: resume.full_name || "Unnamed applicant",
        email: resume.email || "No email",
        mobileNumber: resume.mobile_number,
        alternatePhone: resume.alternate_phone,
        currentAddress: resume.current_address,
        city: resume.city,
        state: resume.state,
        country: resume.country,
        linkedin: resume.linkedin_profile,
        portfolio: resume.portfolio_url,
        github: resume.github_url,
        careerObjective: resume.career_objective,
        fileName: resume.original_file_name,
        filePath: resume.resume_file_path,
        mimeType: resume.resume_mime_type,
        fileSize: resume.resume_file_size,
        parsedAt: resume.parsed_at,
        summary: resume.professional_summary,
        technicalSkills: resume.technical_skills,
        softSkills: resume.soft_skills,
        workExperience: resume.work_experience,
        education: resume.education,
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
        parsingStatus: resume.parsing_status,
        parserVersion: resume.parser_version,
        aiModel: resume.ai_model,
        jobDescriptionId: resume.job_description_id,
        matchUrlId: resume.uid,
        matchingScore: comparisonComplete
          ? Number(comparison.final_score ?? resume.matching_score ?? 0)
          : null,
        matchingStatus: comparison?.processing_status || "PENDING",
        matchingError: comparison?.processing_error || null,
        matchingCriteria: !comparisonComplete ? null : {
          skills: comparison.skills_score != null ? Number(comparison.skills_score) : null,
          experience: comparison.experience_score != null ? Number(comparison.experience_score) : null,
          education: comparison.education_score != null ? Number(comparison.education_score) : null,
          keywords: comparison.keyword_score != null ? Number(comparison.keyword_score) : null,
          location: comparison.location_score != null ? Number(comparison.location_score) : null,
          salary: comparison.salary_score != null ? Number(comparison.salary_score) : null,
          noticePeriod: comparison.notice_period_score != null ? Number(comparison.notice_period_score) : null,
          certifications: comparison.certification_score != null ? Number(comparison.certification_score) : null,
          projectsDomain: comparison.project_score != null ? Number(comparison.project_score) : null,
        },
        // APPLICATION STATUS
        applicationStatus: resume.application_status,

        // INTERVIEW DETAILS
        interviewScheduled: !!resume.candidate?.interview_date,
        interviewDate: resume.candidate?.interview_date || null,
        interviewTimeFrom: resume.candidate?.interview_time_from || null,
        interviewTimeTo: resume.candidate?.interview_time_to || null,
      });}),
      jobs: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        department: job.department,
        status: job.status,
        openings: job.openings,
        work_mode: job.work_mode,
      })),
    });
  } catch (error) {
    console.error("Application dashboard error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load application dashboard" },
      { status: 500 }
    );
  }
}