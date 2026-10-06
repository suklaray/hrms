import type { Metadata } from "next";
import Client from "./Client";

export const metadata: Metadata = {
  title: "Candidate Match Details - HRMS",
};

export default async function CandidateMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  return <Client />;
}
