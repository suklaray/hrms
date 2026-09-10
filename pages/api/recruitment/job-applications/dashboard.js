import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const [resumes, jobs] = await Promise.all([
      prisma.parsed_resumes.findMany({ where: { parsing_status: "DONE" }, orderBy: { parsed_at: "desc" },
        include: {
        candidate: true,
        }, 
      }),
      prisma.job_descriptions.findMany({ where: { status: { not: "Closed" } }, orderBy: { created_at: "desc" }
      }),
    ]);

    return res.status(200).json({
      success: true,
      resumes: resumes.map((resume) => ({
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
        matchingScore: resume.matching_score,
        // APPLICATION STATUS
        applicationStatus: resume.application_status,

        // INTERVIEW DETAILS
        interviewScheduled: !!resume.candidate?.interview_date,
        interviewDate: resume.candidate?.interview_date || null,
        interviewTimeFrom: resume.candidate?.interview_time_from || null,
        interviewTimeTo: resume.candidate?.interview_time_to || null,
      })),
      jobs: jobs.map((job) => ({ id: job.id, title: job.title, department: job.department, status: job.status })),
    });
  } catch (error) {
    console.error("Application dashboard error:", error);
    return res.status(500).json({ success: false, error: "Failed to load application dashboard" });
  }
}