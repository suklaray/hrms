"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, RefreshCw, Save, Sparkles } from "lucide-react";
import SideBar from "@/Components/SideBar";
import Breadcrumb from "@/Components/Breadcrumb";

const REVIEW_CRITERIA = [
  "skills",
  "experience",
  "education",
  "keywords",
  "location",
  "salary",
  "noticePeriod",
  "certifications",
  "projectsDomain",
] as const;

type ReviewCriterion = (typeof REVIEW_CRITERIA)[number];

function normalizeReviewCriteria(value: unknown): ReviewCriterion[] {
  return Array.isArray(value)
    ? REVIEW_CRITERIA.filter((criterion) => value.includes(criterion))
    : [];
}

interface CandidateData {
  id: number;
  name: string;
  email: string;
  mobileNumber: string | null;
  currentAddress: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  careerObjective: string | null;
  summary: string | null;
  workExperience: unknown;
  education: unknown;
  technicalSkills: unknown;
  softSkills: unknown;
  certifications: unknown;
  languages: unknown;
  projects: unknown;
  noticePeriod: string | null;
  currentSalary: string | null;
  expectedSalary: string | null;
  preferredLocation: string | null;
  parsedAt: string;
}

interface JobData {
  id: number;
  title: string;
  department: string;
  employment_type: string;
  work_mode: string;
  location: string;
  experience: string;
  education: string;
  required_skills: string;
  preferred_skills: string | null;
  responsibilities: string;
  summary: string;
  salary_min: string | null;
  salary_max: string | null;
  keywords: string | null;
  analysis: Record<string, unknown> | null;
}

interface MatchData {
  finalScore: number;
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  keywordScore: number;
  certificationScore: number;
  projectScore: number;
  locationScore: number;
  salaryScore: number;
  noticePeriodScore: number;
  recommendation: string;
  breakdown: Record<string, unknown> | null;
  recruiterSelectedCriteria: ReviewCriterion[];
  recruiterReviewedAt: string | null;
}

interface MatchRow {
  criterion: ReviewCriterion;
  category: string;
  score: number;
  requirements: ReactNode;
  candidateEvidence: ReactNode;
  result: ReactNode;
  deductionReason: ReactNode;
}

interface Comparison {
  status: string;
  error: string | null;
  candidate: CandidateData;
  job: JobData;
  match: MatchData | null;
}

interface MatchSection {
  score: number;
  matched?: unknown;
  missing?: unknown;
  additional?: unknown;
  required?: string;
  candidate?: string;
  notes?: string;
  percentage?: number;
  job_location?: string;
  candidate_location?: string;
  budget_range?: string;
  expected?: string;
  candidate_notice?: string;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (Array.isArray(value)) {
    return value.length ? value.map(formatValue).join(", ") : "Not provided";
  }
  if (typeof value === "object") {
    const details = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== null && item !== undefined && item !== "")
      .map(([key, item]) => `${key.replace(/([A-Z])/g, " $1")}: ${formatValue(item)}`);
    return details.length ? details.join(" · ") : "Not provided";
  }
  return String(value);
}

function getSection(breakdown: MatchData["breakdown"], key: string): MatchSection {
  const value = breakdown?.[key];
  return value && typeof value === "object"
    ? (value as MatchSection)
    : { score: 0 };
}

function listValue(value: unknown): string {
  return formatValue(value);
}

function skillItems(value: unknown): string[] {
  const collectItems = (item: unknown): string[] => {
    if (Array.isArray(item)) return item.flatMap(collectItems);
    if (typeof item !== "string") {
      const formatted = formatValue(item);
      return formatted === "Not provided" ? [] : [formatted];
    }

    const trimmed = item.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.flatMap(collectItems);
      } catch {
        // Keep malformed serialized data readable by falling back to delimiters.
      }
    }

    return trimmed
      .split(/[,;\n]+/)
      .map((value) => value.trim().replace(/^["']|["']$/g, ""))
      .filter((value) => value && value !== "Not provided");
  };

  return collectItems(value);
}

function SkillGroup({ label, value }: { label: string; value: unknown }) {
  const items = skillItems(value);

  return (
    <div className="min-w-0">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      {items.length ? (
        <p className="break-words text-sm text-gray-700">{items.join(", ")}</p>
      ) : (
        <p className="text-sm text-gray-500">Not provided</p>
      )}
    </div>
  );
}

export default function CandidateMatchClient() {
  const params = useParams<{ id: string }>();
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [selectedCriteria, setSelectedCriteria] = useState<ReviewCriterion[]>([]);
  const [error, setError] = useState("");
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const loadComparison = async () => {
      try {
        const response = await fetch(
          `/api/recruitment/job-application/${params.id}/match`
        );
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || "Unable to load candidate comparison");
        }
        if (active) {
          setComparison(result);
          setSelectedCriteria(normalizeReviewCriteria(result.match?.recruiterSelectedCriteria));
          if (result.status === "PENDING" || result.status === "PROCESSING") {
            timer = setTimeout(loadComparison, 2500);
          }
        }
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Unable to load candidate comparison");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    if (params.id) void loadComparison();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [params.id]);

  const retryComparison = async () => {
    setRetrying(true);
    try {
      const response = await fetch(
        `/api/recruitment/job-application/${params.id}/match`,
        { method: "POST" }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to retry candidate comparison");
      const detailResponse = await fetch(
        `/api/recruitment/job-application/${params.id}/match`
      );
      const details = await detailResponse.json();
      if (!detailResponse.ok || !details.success) {
        throw new Error(details.error || "Unable to reload candidate comparison");
      }
      setComparison(details);
      setSelectedCriteria(normalizeReviewCriteria(details.match?.recruiterSelectedCriteria));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to retry candidate comparison");
    } finally {
      setRetrying(false);
    }
  };

  const rows = useMemo<MatchRow[]>(() => {
    if (!comparison || comparison.status !== "COMPLETED" || !comparison.match) return [];

    const { candidate, job, match } = comparison;
    const breakdown = match.breakdown;
    const skills = getSection(breakdown, "skills");
    const experience = getSection(breakdown, "experience");
    const education = getSection(breakdown, "education");
    const keywords = getSection(breakdown, "keywords");
    const location = getSection(breakdown, "location");
    const salary = getSection(breakdown, "salary");
    const notice = getSection(breakdown, "notice_period");
    const certifications = getSection(breakdown, "certifications");
    const projects = getSection(breakdown, "projects_domain");
    const analysis = job.analysis || {};
    const keywordRequirements = [
      analysis.technical_keywords,
      analysis.functional_keywords,
      analysis.industry_keywords,
      analysis.role_keywords,
      job.keywords,
    ].filter(Boolean);
    const certificationRequirements = [
      analysis.mandatory_certifications,
      analysis.preferred_certifications,
    ].filter(Boolean);

    return [
      {
        criterion: "skills",
        category: "Skills",
        score: match.skillsScore,
        requirements: (
          <div className="space-y-4">
            <SkillGroup label="Required" value={job.required_skills} />
            <SkillGroup label="Preferred" value={job.preferred_skills} />
          </div>
        ),
        candidateEvidence: (
          <div className="space-y-4">
            <SkillGroup label="Technical" value={candidate.technicalSkills} />
            <SkillGroup label="Soft skills" value={candidate.softSkills} />
          </div>
        ),
        result: (
          <div className="space-y-4">
            <SkillGroup label="Matched" value={skills.matched} />
            <SkillGroup label="Missing" value={skills.missing} />
            <SkillGroup label="Additional" value={skills.additional} />
          </div>
        ),
        deductionReason: skillItems(skills.missing).length
          ? `Missing required skills: ${skillItems(skills.missing).join(", ")}.`
          : "Partial skill match — candidate does not fully meet the required and preferred skill set.",
      },
      {
        criterion: "experience",
        category: "Experience",
        score: match.experienceScore,
        requirements: experience.required || job.experience || "Not specified",
        candidateEvidence: experience.candidate || formatValue(candidate.workExperience),
        result: experience.notes || "Experience score based on the parsed profile and job requirements.",
        deductionReason: experience.notes || "Candidate experience does not fully meet the job requirement.",
      },
      {
        criterion: "education",
        category: "Education",
        score: match.educationScore,
        requirements: `${job.education}; Degree: ${formatValue(analysis.degree)}; Stream: ${formatValue(analysis.stream)}`,
        candidateEvidence: formatValue(candidate.education),
        result: education.notes || "Education score based on the parsed profile and job requirements.",
        deductionReason: education.notes || "Candidate education does not fully satisfy the required degree, stream, or level.",
      },
      {
        criterion: "keywords",
        category: "ATS & keywords",
        score: match.keywordScore,
        requirements: formatValue(keywordRequirements),
        candidateEvidence: `Matched keywords: ${listValue(keywords.matched)}`,
        result: `Keyword coverage: ${keywords.percentage ?? match.keywordScore}%; Missing: ${listValue(keywords.missing)}`,
        deductionReason: skillItems(keywords.missing).length
          ? `Only ${keywords.percentage ?? match.keywordScore}% keyword coverage. Missing: ${skillItems(keywords.missing).join(", ")}.`
          : `Keyword coverage is ${keywords.percentage ?? match.keywordScore}% — resume does not contain enough job-relevant terms.`,
      },
      {
        criterion: "location",
        category: "Location",
        score: match.locationScore,
        requirements: `${job.location} · ${job.work_mode}`,
        candidateEvidence: `${location.candidate_location || [candidate.city, candidate.state, candidate.country].filter(Boolean).join(", ") || "Not provided"}; Preferred: ${formatValue(candidate.preferredLocation)}`,
        result: location.notes || "Location score considers the job location, work mode and candidate preference.",
        deductionReason: location.notes || "Candidate location or preferred location does not align with the job location or work mode.",
      },
      {
        criterion: "salary",
        category: "Salary",
        score: match.salaryScore,
        requirements: `Budget: ${salary.budget_range || `${formatValue(job.salary_min)} - ${formatValue(job.salary_max)}`}`,
        candidateEvidence: `Current: ${formatValue(candidate.currentSalary)}; Expected: ${salary.expected || formatValue(candidate.expectedSalary)}`,
        result: salary.notes || "Salary score compares expected compensation with the available budget.",
        deductionReason: salary.notes || "Candidate's expected salary does not align with the available budget.",
      },
      {
        criterion: "noticePeriod",
        category: "Notice period",
        score: match.noticePeriodScore,
        requirements: "Joining timeline for this role",
        candidateEvidence: notice.candidate_notice || formatValue(candidate.noticePeriod),
        result: notice.notes || "Notice period score considers the candidate's availability.",
        deductionReason: notice.notes || "Candidate's notice period may not meet the expected joining timeline.",
      },
      {
        criterion: "certifications",
        category: "Certifications",
        score: match.certificationScore,
        requirements: formatValue(certificationRequirements),
        candidateEvidence: formatValue(candidate.certifications),
        result: `Matched: ${listValue(certifications.matched)}; Missing: ${listValue(certifications.missing)}`,
        deductionReason: skillItems(certifications.missing).length
          ? `Missing certifications: ${skillItems(certifications.missing).join(", ")}.`
          : "Candidate does not hold all the required or preferred certifications.",
      },
      {
        criterion: "projectsDomain",
        category: "Projects & domain",
        score: match.projectScore,
        requirements: `${formatValue(analysis.domain_expertise)}; Responsibilities: ${job.responsibilities}`,
        candidateEvidence: formatValue(candidate.projects),
        result: projects.notes || "Project score considers relevant project evidence, domain and technology stack.",
        deductionReason: projects.notes || "Candidate projects or domain experience do not sufficiently match the job's domain and responsibilities.",
      },
    ];
  }, [comparison]);

  const selectedRows = rows.filter((row) => selectedCriteria.includes(row.criterion));
  const recruiterScore = selectedRows.length
    ? Math.round(
        (selectedRows.reduce((total, row) => total + row.score, 0) / selectedRows.length) * 100
      ) / 100
    : null;
  const savedCriteria = comparison?.match?.recruiterSelectedCriteria || [];
  const reviewIsDirty =
    selectedCriteria.length !== savedCriteria.length ||
    selectedCriteria.some((criterion) => !savedCriteria.includes(criterion));

  const toggleCriterion = (criterion: ReviewCriterion) => {
    setReviewError("");
    setSelectedCriteria((current) =>
      current.includes(criterion)
        ? current.filter((item) => item !== criterion)
        : [...current, criterion]
    );
  };

  const saveRecruiterReview = async () => {
    setSavingReview(true);
    setReviewError("");
    try {
      const response = await fetch(
        `/api/recruitment/job-application/${params.id}/match`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedCriteria }),
        }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to save recruiter score");
      }
      setComparison((current) =>
        current?.match
          ? {
              ...current,
              match: {
                ...current.match,
                finalScore: result.finalScore,
                recruiterSelectedCriteria: result.selectedCriteria,
                recruiterReviewedAt: result.reviewedAt,
              },
            }
          : current
      );
      setSelectedCriteria(normalizeReviewCriteria(result.selectedCriteria));
    } catch (cause) {
      setReviewError(cause instanceof Error ? cause.message : "Unable to save recruiter score");
    } finally {
      setSavingReview(false);
    }
  };

  const breadcrumbItems = [
    { label: "Recruitment", href: "/Recruitment/recruitment" },
    { label: "Job Applications", href: "/Recruitment/job-applications" },
    { label: comparison?.candidate.name || "Candidate comparison" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SideBar />
      <main className="flex-1 overflow-auto">
        <Breadcrumb items={breadcrumbItems} />
        <div className="p-6 lg:p-10">
          <Link
            href="/Recruitment/job-applications"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to job applications
          </Link>

          {loading ? (
            <div className="flex min-h-80 items-center justify-center gap-3 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              Generating candidate comparison...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-white p-8 text-center">
              <p className="font-semibold text-red-700">Comparison unavailable</p>
              <p className="mt-2 text-sm text-gray-600">{error}</p>
            </div>
          ) : comparison && comparison.status !== "COMPLETED" ? (
            <div className="mx-auto max-w-2xl rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
              {comparison.status === "FAILED" ? (
                <>
                  <p className="font-semibold text-red-700">Comparison could not be completed</p>
                  <p className="mt-2 text-sm text-gray-600">{comparison.error || "Matching failed. The parsed profile is still saved."}</p>
                  <button
                    onClick={retryComparison}
                    disabled={retrying}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-indigo-300"
                  >
                    <RefreshCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
                    {retrying ? "Retrying..." : "Retry comparison"}
                  </button>
                </>
              ) : (
                <>
                  <Loader2 className="mx-auto h-7 w-7 animate-spin text-indigo-600" />
                  <p className="mt-3 font-semibold text-gray-800">Comparing candidate with the job</p>
                  <p className="mt-1 text-sm text-gray-500">The parsed resume is saved. This page will show the score and detailed insights when matching finishes.</p>
                </>
              )}
            </div>
          ) : comparison?.status === "COMPLETED" && comparison.match ? (
            <>
              <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-600">
                    AI candidate comparison
                  </p>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {comparison.candidate.name}
                  </h1>
                  <p className="mt-1 text-gray-500">
                    {comparison.candidate.email} · {comparison.job.title}
                  </p>
                </div>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <table className="min-w-64 border-collapse text-sm">
                    <tbody>
                      <tr>
                        <th className="border border-gray-200 bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {comparison.match.recruiterReviewedAt ? "Final match score" : "AI match score"}
                        </th>
                        <td className="min-w-28 border border-gray-200 px-4 py-3 text-right">
                          <span className="font-bold text-indigo-600">
                            {comparison.match.finalScore}%
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="border border-gray-200 px-4 py-2 text-right text-xs text-gray-500">
                          {comparison.match.recruiterReviewedAt
                            ? `Saved ${new Date(comparison.match.recruiterReviewedAt).toLocaleString("en-IN")}`
                            : "Select criteria using checkbox to create the recruiter final score"}
                        </td>
                      </tr>
                      {reviewIsDirty && recruiterScore !== null && (
                        <tr>
                          <th className="border border-gray-200 bg-emerald-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-emerald-700">
                            Recruiter score preview
                          </th>
                          <td className="border border-gray-200 bg-emerald-50 px-4 py-3 text-right">
                            <span className="font-bold text-emerald-700">{recruiterScore}%</span>
                          </td>
                        </tr>
                      )}
                      {reviewIsDirty && recruiterScore !== null && (
                        <tr>
                          <td colSpan={2} className="border border-gray-200 px-4 py-2 text-right text-xs text-emerald-600">
                            Preview only — save to update the final score
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </header>

              <section className="mb-6 grid gap-4 lg:grid-cols-2">
                <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-3 font-bold text-gray-900">Job description</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <tbody>
                        {[
                          ["Department", comparison.job.department],
                          ["Employment type", comparison.job.employment_type],
                          ["Location / work mode", `${comparison.job.location} · ${comparison.job.work_mode}`],
                          ["Experience", comparison.job.experience],
                          ["Education", comparison.job.education],
                          ["Salary range", `${formatValue(comparison.job.salary_min)} - ${formatValue(comparison.job.salary_max)}`],
                        ].map(([label, value]) => (
                          <tr key={label} className="hover:bg-gray-50">
                            <th className="w-2/5 border border-gray-200 px-4 py-3 text-left font-medium text-gray-600">{label}</th>
                            <td className="border border-gray-200 px-4 py-3 text-left text-gray-700">{value || "Not provided"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
                <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-3 font-bold text-gray-900">Parsed candidate profile</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <tbody>
                        {[
                          ["Name", comparison.candidate.name],
                          ["Email", comparison.candidate.email],
                          ["Mobile", comparison.candidate.mobileNumber],
                          ["Current location", [comparison.candidate.city, comparison.candidate.state, comparison.candidate.country].filter(Boolean).join(", ")],
                          ["Preferred location", comparison.candidate.preferredLocation],
                          ["Notice period", comparison.candidate.noticePeriod],
                          ["Current salary", comparison.candidate.currentSalary],
                          ["Expected salary", comparison.candidate.expectedSalary],
                          ["Parsed date", new Date(comparison.candidate.parsedAt).toLocaleDateString("en-IN")],
                        ].map(([label, value]) => (
                          <tr key={label} className="hover:bg-gray-50">
                            <th className="w-2/5 border border-gray-200 px-4 py-3 text-left font-medium text-gray-600">{label}</th>
                            <td className="border border-gray-200 px-4 py-3 text-left text-gray-700">{value || "Not provided"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              </section>

              <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-5 py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="font-bold text-gray-900">Detailed matching breakdown</h2>
                      <p className="mt-1 text-sm text-gray-500">
                        Select the criteria to include in the recruiter score. The preview is their simple average.
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {selectedRows.length} of {rows.length} criteria selected
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={saveRecruiterReview}
                      disabled={savingReview || selectedRows.length === 0 || !reviewIsDirty}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      <Save className="h-4 w-4" />
                      {savingReview
                        ? "Saving..."
                        : comparison.match.recruiterReviewedAt
                          ? "Update recruiter score"
                          : "Save recruiter score"}
                    </button>
                  </div>
                  {reviewError && (
                    <p role="alert" className="mt-3 text-sm text-red-600">{reviewError}</p>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="border border-gray-200 px-4 py-3 text-left">Include</th>
                        <th className="border border-gray-200 px-4 py-3 text-left">Criteria</th>
                        <th className="border border-gray-200 px-4 py-3 text-left">Job requirement</th>
                        <th className="border border-gray-200 px-4 py-3 text-left">Candidate evidence</th>
                        <th className="border border-gray-200 px-4 py-3 text-left">Matching insights</th>
                        <th className="border border-gray-200 px-4 py-3 text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {rows.map((row) => (
                        <tr key={row.category} className="align-top hover:bg-gray-50/70">
                          <td className="border border-gray-200 px-4 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={selectedCriteria.includes(row.criterion)}
                              onChange={() => toggleCriterion(row.criterion)}
                              aria-label={`Include ${row.category} in recruiter score`}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <th className="border border-gray-200 px-4 py-4 text-left font-semibold text-gray-800">{row.category}</th>
                          <td className="max-w-sm whitespace-normal break-words border border-gray-200 px-4 py-4 text-left leading-relaxed text-gray-600">{row.requirements}</td>
                          <td className="max-w-sm whitespace-normal break-words border border-gray-200 px-4 py-4 text-left leading-relaxed text-gray-600">{row.candidateEvidence}</td>
                          <td className="max-w-sm whitespace-normal break-words border border-gray-200 px-4 py-4 text-left leading-relaxed text-gray-600">{row.result}</td>
                          <td className="border border-gray-200 px-4 py-4 text-right">
                            <span className="inline-flex min-w-14 justify-center rounded-lg bg-indigo-50 px-2.5 py-1 font-bold text-indigo-700">
                              {row.score}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="mt-6 overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm">
                <div className="border-b border-red-100 bg-red-50 px-5 py-4">
                  <h2 className="font-bold text-gray-900">Score deductions breakdown</h2>
                  <p className="mt-1 text-sm text-gray-500">Criteria where marks were deducted — showing what was required, what the candidate provided, and why points were lost.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="border border-gray-200 px-4 py-3">Criteria</th>
                        <th className="border border-gray-200 px-4 py-3">Job requirement</th>
                        <th className="border border-gray-200 px-4 py-3">Candidate evidence</th>
                        <th className="border border-gray-200 px-4 py-3">Reason for deduction</th>
                        <th className="border border-gray-200 px-4 py-3 text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {rows
                        .filter((r) => r.score < 100)
                        .sort((a, b) => a.score - b.score)
                        .map((r) => (
                          <tr key={r.criterion} className="align-top hover:bg-red-50/40">
                            <th className="border border-gray-200 px-4 py-4 text-left font-semibold text-gray-800">{r.category}</th>
                            <td className="max-w-sm whitespace-normal break-words border border-gray-200 px-4 py-4 leading-relaxed text-gray-600">{r.requirements}</td>
                            <td className="max-w-sm whitespace-normal break-words border border-gray-200 px-4 py-4 leading-relaxed text-gray-600">{r.candidateEvidence}</td>
                            <td className="max-w-sm whitespace-normal break-words border border-gray-200 px-4 py-4 leading-relaxed text-gray-600">{r.deductionReason}</td>
                            <td className="border border-gray-200 px-4 py-4 text-right">
                              <span className="inline-flex min-w-14 justify-center rounded-lg bg-red-50 px-2.5 py-1 font-bold text-red-600">
                                -{(100 - r.score).toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <h2 className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 font-bold text-gray-900">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  AI recommendation
                </h2>
                <table className="min-w-full border-collapse text-sm">
                  <tbody>
                    <tr>
                      <th className="w-48 border border-gray-200 px-4 py-3 text-left font-medium text-gray-600">Recommendation</th>
                      <td className="whitespace-pre-wrap border border-gray-200 px-4 py-3 text-left leading-relaxed text-gray-700">
                        {comparison.match.recommendation || "No recommendation was provided."}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-3 font-bold text-gray-900">Additional candidate profile data</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <tbody>
                      {[
                        ["Candidate summary", comparison.candidate.summary || comparison.candidate.careerObjective || "No summary was parsed from this resume."],
                        ["Languages", formatValue(comparison.candidate.languages)],
                        ["Soft skills", formatValue(comparison.candidate.softSkills)],
                      ].map(([label, value]) => (
                        <tr key={label} className="hover:bg-gray-50">
                          <th className="w-48 border border-gray-200 px-4 py-3 text-left font-medium text-gray-600">{label}</th>
                          <td className="whitespace-pre-wrap border border-gray-200 px-4 py-3 text-left leading-relaxed text-gray-700">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
