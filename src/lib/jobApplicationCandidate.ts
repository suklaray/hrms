import type { Prisma } from "@prisma/client";

type ParsedResumeCandidate = {
  id: number;
  full_name: string | null;
  email: string | null;
  mobile_number: string | null;
  resume_file_path: string | null;
};

type InterviewSchedule = {
  date: Date;
  timeFrom: string;
  timeTo: string;
};

export async function ensureCandidateForApprovedInterview(
  transaction: Prisma.TransactionClient,
  resume: ParsedResumeCandidate,
  schedule: InterviewSchedule
) {
  const existingCandidate = await transaction.candidates.findUnique({
    where: { parsed_resume_id: resume.id },
  });

  if (existingCandidate) {
    return transaction.candidates.update({
      where: { id: existingCandidate.id },
      data: {
        interview_date: schedule.date,
        interview_time_from: schedule.timeFrom,
        interview_time_to: schedule.timeTo,
        status: "Pending",
      },
    });
  }

  const today = new Date();
  const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const lastCandidate = await transaction.candidates.findFirst({
    where: { candidate_id: { startsWith: datePrefix } },
    orderBy: { candidate_id: "desc" },
    select: { candidate_id: true },
  });
  const lastSerial = Number(lastCandidate?.candidate_id?.slice(-6));
  const nextSerial = Number.isInteger(lastSerial) && lastSerial > 0 ? lastSerial + 1 : 1;

  return transaction.candidates.create({
    data: {
      candidate_id: `${datePrefix}${String(nextSerial).padStart(6, "0")}`,
      name: resume.full_name || "Unnamed candidate",
      email: resume.email || "",
      contact_number: resume.mobile_number || "",
      resume: resume.resume_file_path || "",
      parsed_resume_id: resume.id,
      status: "Pending",
      interview_date: schedule.date,
      interview_time_from: schedule.timeFrom,
      interview_time_to: schedule.timeTo,
      interview_mail_status: "Not Sent",
      form_status: "Mail Not Sent",
      verification: false,
      form_submitted: false,
    },
  });
}
