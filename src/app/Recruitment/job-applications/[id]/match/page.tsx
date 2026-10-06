import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  decryptResumeId,
  encryptResumeId,
} from "@/lib/recruitment/resumeIdEncryption";
import Client from "./Client";

export const metadata: Metadata = {
  title: "Candidate Match Details - HRMS",
};

export default async function CandidateMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (/^[1-9]\d*$/.test(id)) {
    redirect(`/Recruitment/job-applications/${encryptResumeId(Number(id))}/match`);
  }

  try {
    decryptResumeId(id);
  } catch {
    notFound();
  }

  return <Client />;
}
