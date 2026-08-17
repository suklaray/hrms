import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  const { id } = req.query;
  const jdId = parseInt(id);
  if (isNaN(jdId)) return res.status(400).json({ message: "Invalid ID" });

  if (req.method === "GET") {
    try {
      const job = await prisma.job_descriptions.findUnique({ where: { id: jdId } });
      if (!job) return res.status(404).json({ message: "Not found" });
      return res.status(200).json({
        ...job,
        required_skills: JSON.parse(job.required_skills || "[]"),
        preferred_skills: JSON.parse(job.preferred_skills || "[]"),
      });
    } catch {
      return res.status(500).json({ message: "Server error" });
    }
  }

  if (req.method === "PUT") {
    const {
      title, department, employment_type, work_mode, location, openings,
      experience, education, required_skills, preferred_skills,
      responsibilities, summary, salary_min, salary_max, benefits,
      deadline, hiring_manager, interview_process, keywords, status,
    } = req.body;

    if (!title?.trim()) return res.status(400).json({ message: "Job title is required" });
    if (!department?.trim()) return res.status(400).json({ message: "Department is required" });
    if (!required_skills?.length) return res.status(400).json({ message: "At least one required skill must be provided" });
    if (!deadline) return res.status(400).json({ message: "Deadline is required" });
    if (new Date(deadline) <= new Date()) return res.status(400).json({ message: "Deadline must be a future date" });

    try {
      const job = await prisma.job_descriptions.update({
        where: { id: jdId },
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
          status,
        },
      });
      return res.status(200).json({ ...job, required_skills, preferred_skills });
    } catch {
      return res.status(500).json({ message: "Server error" });
    }
  }
//For deleteing a job description from db.
//   if (req.method === "DELETE") {
//     try {
//       await prisma.job_descriptions.delete({ where: { id: jdId } });
//       return res.status(200).json({ message: "Deleted" });
//     } catch {
//       return res.status(500).json({ message: "Server error" });
//     }
//   }

    if (req.method === "PATCH") {
    try {
        const job = await prisma.job_descriptions.update({
        where: { id: jdId },
        data: { status: "Closed" },
        });
        return res.status(200).json(job);
    } catch {
        return res.status(500).json({ message: "Server error" });
    }
    }
  return res.status(405).json({ message: "Method not allowed" });
}
