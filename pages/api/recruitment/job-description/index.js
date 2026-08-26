import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";

function isRecruitmentUser(req) {
  try {
    const { token } = cookie.parse(req.headers.cookie || "");
    const user = jwt.verify(token, process.env.JWT_SECRET);
    return ["hr", "admin", "recruiter", "superadmin"].includes(user.role?.toLowerCase());
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (!isRecruitmentUser(req)) return res.status(401).json({ message: "Unauthorized" });

  if (req.method === "GET") {
    try {
      const jobs = await prisma.job_descriptions.findMany({
        orderBy: { created_at: "desc" },
      });
      const parsed = jobs.map((j) => ({
        ...j,
        required_skills: JSON.parse(j.required_skills || "[]"),
        preferred_skills: JSON.parse(j.preferred_skills || "[]"),
      }));
      return res.status(200).json(parsed);
    } catch (err) {
      return res.status(500).json({ message: "Server error" });
    }
  }

  if (req.method === "POST") {
    const {
      title, department, employment_type, work_mode, location, openings,
      experience, education, required_skills, preferred_skills,
      responsibilities, summary, salary_min, salary_max, benefits,
      deadline, hiring_manager, interview_process, keywords, status,
    } = req.body;

    // Validations
    if (!title?.trim()) return res.status(400).json({ message: "Job title is required" });
    if (!department?.trim()) return res.status(400).json({ message: "Department is required" });
    if (!required_skills?.length) return res.status(400).json({ message: "At least one required skill must be provided" });
    if (!experience?.trim()) return res.status(400).json({ message: "Experience is required" });
    if (!education?.trim()) return res.status(400).json({ message: "Educational qualification is required" });
    if (!deadline) return res.status(400).json({ message: "Application deadline is required" });
    if (new Date(deadline) <= new Date()) return res.status(400).json({ message: "Deadline must be a future date" });

    try {
      const job = await prisma.job_descriptions.create({
        data: {
          title: title.trim(),
          department: department.trim(),
          employment_type,
          work_mode,
          location,
          openings: parseInt(openings),
          experience,
          education,
          required_skills: JSON.stringify(required_skills),
          preferred_skills: JSON.stringify(preferred_skills || []),
          responsibilities,
          summary,
          salary_min: salary_min || null,
          salary_max: salary_max || null,
          benefits: benefits || null,
          deadline: new Date(deadline),
          hiring_manager,
          interview_process: interview_process || null,
          keywords: keywords || null,
          status: status || "Draft",
        },
      });
      return res.status(201).json({ ...job, required_skills, preferred_skills });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
