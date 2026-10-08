"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SideBar from "@/Components/SideBar";
import {
  Search,
  Plus,
  Pencil,
  Briefcase,
  Users,
  CheckCircle,
  XCircle,
  ChevronDown,
  Eye,
  X,
  AlertTriangle,
  Lock,
  Sparkles,
  Target,
  ListChecks,
  AlertCircle,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import Pagination from "@/Components/Pagination";
import { toast } from "react-toastify";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

type Status = "Draft" | "Published" | "Closed";

interface Job {
  id: number;
  title: string;
  department: string;
  employment_type: string;
  work_mode: string;
  location: string;
  openings: number;
  experience: string;
  education: string;
  required_skills: string[];
  preferred_skills: string[];
  responsibilities: string;
  summary: string;
  salary_min?: string | null;
  salary_max?: string | null;
  benefits?: string | null;
  deadline: string;
  hiring_manager?: string | null;
  interview_process?: string | null;
  keywords?: string | null;
  status: Status;
  [key: string]: unknown;
}

interface StatusConfig {
  bg: string;
  text: string;
  dot: string;
}

const STATUS_CONFIG: Record<
  Status,
  StatusConfig
> = {
  Draft: {
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
  },
  Published: {
    bg: "bg-green-100",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  Closed: {
    bg: "bg-red-100",
    text: "text-red-700",
    dot: "bg-red-500",
  },
};

const STATUSES = [
  "All Status",
  "Draft",
  "Published",
  "Closed",
] as const;

const WORK_MODES = [
  "All Work Modes",
  "Remote",
  "On-site",
  "Hybrid",
] as const;

type Analysis = {
  jobInformation?: {
    jobTitle?: string;
    department?: string;
    employmentType?: string;
    workMode?: string;
    location?: string;
    minimumExperience?: string;
    maximumExperience?: string;
    educationQualification?: string;
    salaryMinimum?: string;
    salaryMaximum?: string;
  };

  skillsAnalysis?: {
    mandatorySkills?: unknown[];
    preferredSkills?: unknown[];
    softSkills?: unknown[];
  };

  keywords?: {
    technical?: unknown[];
    functional?: unknown[];
    industry?: unknown[];
    roleBased?: unknown[];
  };

  experienceAnalysis?: {
    minimumExperience?: string;
    maximumExperience?: string;
    industryExperience?: unknown[];
    domainExpertise?: unknown[];
  };

  educationAnalysis?: {
    degree?: unknown[];
    stream?: unknown[];
    certifications?: unknown[];
    mandatoryCertifications?: unknown[];
    preferredCertifications?: unknown[];
  };

  responsibilities?: {
    primary?: unknown[];
    secondary?: unknown[];
    leadership?: unknown[];
  };

  qualityScore?: {
    overall?: number;
    completeness?: number;
    readability?: number;
    atsFriendliness?: number;
    biasFreeLanguage?: number;
    keywordOptimization?: number;
  };

  missingInformation?: unknown[];

  biasDetection?: {
    detected?: boolean;
    issues?: unknown[];
  };

  atsSuggestions?: unknown[];

  matchingCriteria?: {
    requiredSkills?: unknown[];
    niceToHaveSkills?: unknown[];
    experienceWeightage?: number;
    educationWeightage?: number;
    certificationWeightage?: number;
  };
};

const asList = (value: unknown): unknown[] =>
  Array.isArray(value)
    ? value
    : value
      ? [value]
      : [];

const colorClasses: Record<string, string> = {
  indigo: "bg-indigo-50 text-indigo-700",
  green: "bg-green-50 text-green-700",
  blue: "bg-blue-50 text-blue-700",
  purple: "bg-purple-50 text-purple-700",
  amber: "bg-amber-50 text-amber-700",
  orange: "bg-orange-50 text-orange-700",
  red: "bg-red-50 text-red-700",
  teal: "bg-teal-50 text-teal-700",
};

const readableItem = (item: unknown): string => {
  if (
    typeof item === "string" ||
    typeof item === "number"
  ) {
    return String(item);
  }

  if (!item || typeof item !== "object") {
    return "Not provided";
  }

  const value = item as Record<
    string,
    unknown
  >;

  return (
    String(
      value.name ||
        value.skill ||
        value.keyword ||
        value.title ||
        ""
    ) ||
    Object.values(value)
      .filter(Boolean)
      .join(" - ") ||
    "Not provided"
  );
};

interface AnalysisListProps {
  title: string;
  items: unknown;
  icon: React.ComponentType<{
    className?: string;
  }>;
  color?: string;
}

const AnalysisList = ({
  title,
  items,
  icon: Icon,
  color = "indigo",
}: AnalysisListProps) => {
  const values = asList(items);

  if (!values.length) {
    return null;
  }

  return (
    <section className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
        <Icon
          className={`w-4 h-4 text-${color}-600`}
        />
        {title}
      </h3>

      <div className="flex flex-wrap gap-2">
        {values.map((item, index) => (
          <span
            key={`${title}-${index}`}
            className={`text-sm px-3 py-1.5 rounded-lg ${
              colorClasses[color] ||
              colorClasses.indigo
            }`}
          >
            {readableItem(item)}
          </span>
        ))}
      </div>
    </section>
  );
};

export default function JobDescriptions({
  permissions = [],
}: {
  permissions?: string[];
}) {
  const userPermissions = new Set(permissions);
  const canCreate = userPermissions.has(PERMISSION_KEYS.JD_CREATE);
  const canEdit = userPermissions.has(PERMISSION_KEYS.JD_EDIT);
  const canClose = userPermissions.has(PERMISSION_KEYS.JD_CLOSE);
  const canAnalyze = userPermissions.has(PERMISSION_KEYS.JD_ANALYZE);
  const canView = userPermissions.has(PERMISSION_KEYS.JD_VIEW);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] =
    useState<string>("All Status");
  const [workMode, setWorkMode] =
    useState<string>("All Work Modes");

  const [viewJob, setViewJob] =
    useState<Job | null>(null);

  const [deleteJob, setDeleteJob] =
    useState<Job | null>(null);

  const [deleting, setDeleting] = useState(false);
  // keyed by job id so state survives modal close/reopen
  const [pendingCloseAudits, setPendingCloseAudits] = useState<Record<number, string>>({});

  const executeClose = async (jobId: number, auditUid: string) => {
    try {
      const response = await fetch(
        `/api/recruitment/job-description/${jobId}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ auditUid }) }
      );
      const data = await response.json();
      if (response.ok) {
        setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: "Closed" } : j));
        setPendingCloseAudits((prev) => { const next = { ...prev }; delete next[jobId]; return next; });
        toast.success("Job description closed successfully.");
      } else {
        toast.error(data.message || "Failed to close job description.");
        setPendingCloseAudits((prev) => { const next = { ...prev }; delete next[jobId]; return next; });
      }
    } catch {
      toast.error("Failed to close job description.");
    }
  };

  const pollCloseApproval = (jobId: number, auditUid: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/audit/logs?page=1&limit=10&action=jd.close`);
        if (!res.ok) return;
        const data = await res.json();
        const log = data.data?.find((l: any) => l.uid === auditUid);
        if (!log) return;
        if (log.currentStatus === "APPROVED") {
          clearInterval(interval);
          executeClose(jobId, auditUid);
        } else if (log.currentStatus === "REJECTED") {
          clearInterval(interval);
          setPendingCloseAudits((prev) => { const next = { ...prev }; delete next[jobId]; return next; });
          toast.error("Close request was rejected by the auditor.");
        }
      } catch {}
    }, 5000);
  };

  const [analysis, setAnalysis] =
    useState<Analysis | null>(null);

  const [analysisJob, setAnalysisJob] =
    useState<Job | null>(null);

  const [analyzingId, setAnalyzingId] =
    useState<number | null>(null);

  const [viewingAnalysisId, setViewingAnalysisId] =
    useState<number | null>(null);

  const [savedAnalysis, setSavedAnalysis] =
    useState<Analysis | null>(null);

  const [savedAnalysisJob, setSavedAnalysisJob] =
    useState<Job | null>(null);

  const [savingAnalysis, setSavingAnalysis] =
    useState(false);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    fetch("/api/recruitment/job-description")
      .then((r) => r.json())
      .then((data) => {
        setJobs(
          Array.isArray(data) ? data : []
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // For closing a job description, we update the status
  // to "Closed" instead of deleting it from the database.
  const handleDelete = async () => {
    if (!deleteJob) return;
    if (!canClose) {
      toast.error("Permission denied: You cannot close job descriptions");
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(
        `/api/recruitment/job-description/${deleteJob.id}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }
      );

      const data = await response.json();

      if (response.status === 202 && data.requiresApproval) {
        setPendingCloseAudits((prev) => ({ ...prev, [deleteJob.id]: data.auditUid }));
        pollCloseApproval(deleteJob.id, data.auditUid);
        setDeleteJob(null);
        toast.info("Close request submitted. Waiting for auditor approval.");
        return;
      }

      if (!response.ok) {
        toast.error(data.message || "Failed to close job description");
        return;
      }

      setJobs((prev) =>
        prev.map((j) => j.id === deleteJob.id ? { ...j, status: "Closed" } : j)
      );
      setDeleteJob(null);
      toast.success("Job description closed successfully.");
    } catch {
      toast.error("Failed to close job description");
    } finally {
      setDeleting(false);
    }
  };

  const handleAnalyze = async (job: Job) => {
    if (!canAnalyze) {
      toast.error("Permission denied: You cannot analyze job descriptions");
      return;
    }

    setAnalyzingId(job.id);

    try {
      const response = await fetch(
        `/api/recruitment/job-description/${job.id}/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        const error = new Error(
          result.error ||
            "Failed to analyze job description"
        );

        (
          error as Error & {
            status?: number;
          }
        ).status = response.status;

        throw error;
      }

      setAnalysisJob(job);
      setAnalysis(result.data);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to analyze this job description. Please try again.";

      console.warn(
        "JD Analysis unavailable:",
        message
      );

      toast.error(message);
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleReAnalyze = async () => {
    if (!analysisJob) return;

    await handleAnalyze(analysisJob);
  };

  const handleViewSavedAnalysis = async (job: Job) => {
    setViewingAnalysisId(job.id);
    try {
      const response = await fetch(
        `/api/recruitment/job-description/${job.id}/analysis`
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.error || "No saved analysis found for this job.");
        return;
      }
      // Map DB fields back to Analysis shape
      const d = result.data;
      setSavedAnalysis({
        jobInformation: {
          jobTitle: d.job_title,
          department: d.department,
          employmentType: d.employment_type,
          workMode: d.work_mode,
          location: d.location,
          minimumExperience: d.minimum_experience,
          educationQualification: d.education,
          salaryMinimum: d.salary_min,
          salaryMaximum: d.salary_max,
        },
        skillsAnalysis: {
          mandatorySkills: d.mandatory_skills,
          preferredSkills: d.preferred_skills,
          softSkills: d.soft_skills,
        },
        keywords: {
          technical: d.technical_keywords,
          functional: d.functional_keywords,
          industry: d.industry_keywords,
          roleBased: d.role_keywords,
        },
        experienceAnalysis: {
          minimumExperience: d.minimum_experience,
          maximumExperience: d.maximum_experience,
          industryExperience: d.industry_experience,
          domainExpertise: d.domain_expertise,
        },
        educationAnalysis: {
          degree: d.degree,
          stream: d.stream,
          certifications: d.certifications,
          mandatoryCertifications: d.mandatory_certifications,
          preferredCertifications: d.preferred_certifications,
        },
        responsibilities: {
          primary: d.primary_responsibilities,
          secondary: d.secondary_responsibilities,
          leadership: d.leadership_responsibilities,
        },
        qualityScore: {
          overall: d.quality_score,
          completeness: d.completeness_score,
          readability: d.readability_score,
          atsFriendliness: d.ats_score,
          biasFreeLanguage: d.bias_free_score,
          keywordOptimization: d.keyword_score,
        },
        missingInformation: d.missing_information,
        biasDetection: {
          detected: d.bias_detected,
          issues: d.bias_details,
        },
        atsSuggestions: d.ats_suggestions,
        matchingCriteria: {
          experienceWeightage: d.experience_weight,
          educationWeightage: d.education_weight,
          certificationWeightage: d.certification_weight,
          requiredSkills: d.matching_criteria?.requiredSkills,
        },
      });
      setSavedAnalysisJob(job);
    } catch {
      toast.error("Failed to load saved analysis.");
    } finally {
      setViewingAnalysisId(null);
    }
  };

  const handleSaveAnalysis = async () => {
    if (!analysisJob || !analysis) return;
    if (!canAnalyze) {
      toast.error("Permission denied: You cannot save job description analysis");
      return;
    }

    setSavingAnalysis(true);

    try {
      const response = await fetch(
        `/api/recruitment/job-description/${analysisJob.id}/analysis`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            analysis,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Failed to save analysis"
        );
      }

      toast.success(
        "Analysis saved successfully."
      );

      setAnalysis(null);
      setAnalysisJob(null);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save analysis"
      );
    } finally {
      setSavingAnalysis(false);
    }
  };

  const matchesSearch = (
    job: Job,
    searchText: string
  ): boolean => {
    const query = searchText
      .trim()
      .toLowerCase();

    if (!query) return true;

    return Object.values(job).some((value) => {
      if (
        value === null ||
        value === undefined
      ) {
        return false;
      }

      if (typeof value === "object") {
        return JSON.stringify(value)
          .toLowerCase()
          .includes(query);
      }

      return String(value)
        .toLowerCase()
        .includes(query);
    });
  };

  const filtered = jobs.filter((j) => {
    const matchSearch = matchesSearch(
      j,
      search
    );

    const matchStatus =
      status === "All Status" ||
      j.status === status;

    const matchMode =
      workMode === "All Work Modes" ||
      j.work_mode === workMode;

    return (
      matchSearch &&
      matchStatus &&
      matchMode
    );
  });

  useEffect(() => {
    setPage(1);
  }, [search, status, workMode]);

  const kpiCards = [
    {
      label: "Total Jobs",
      value: jobs.length,
      icon: Briefcase,
      color: "bg-indigo-50",
      iconColor: "text-indigo-600",
      filter: "All Status",
    },
    {
      label: "Published",
      value: jobs.filter(
        (j) => j.status === "Published"
      ).length,
      icon: CheckCircle,
      color: "bg-green-50",
      iconColor: "text-green-600",
      filter: "Published",
    },
    {
      label: "Drafts",
      value: jobs.filter(
        (j) => j.status === "Draft"
      ).length,
      icon: XCircle,
      color: "bg-gray-50",
      iconColor: "text-gray-500",
      filter: "Draft",
    },
    {
      label: "Closed Jobs",
      value: jobs.filter(
        (j) => j.status === "Closed"
      ).length,
      icon: Lock,
      color: "bg-red-50",
      iconColor: "text-red-500",
      filter: "Closed",
    },
    {
      label: "Total Openings",
      value: jobs
        .filter(
          (j) => j.status !== "Closed"
        )
        .reduce(
          (s, j) => s + (j.openings || 0),
          0
        ),
      icon: Users,
      color: "bg-purple-50",
      iconColor: "text-purple-600",
      filter: "Published",
    },
  ];

  const paginated = filtered.slice(
    (page - 1) * perPage,
    page * perPage
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SideBar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="relative z-10 bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between shadow-sm">
          <div>
            <nav className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <Link
                href="/Recruitment/recruitment"
                className="hover:text-indigo-600 transition-colors"
              >
                Recruitment
              </Link>

              <span>/</span>

              <span className="text-gray-600 font-medium">
                Job Descriptions
              </span>
            </nav>

            <h1 className="text-xl font-bold text-gray-900">
              Job Descriptions
            </h1>

            <p className="text-sm text-gray-400 mt-0.5">
              Create, manage and publish job
              descriptions.
            </p>
          </div>

          {canCreate && (
            <Link href="/Recruitment/job-description/add">
              <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-sm shadow-indigo-200 cursor-pointer">
                <Plus className="w-4 h-4" />
                Add Job
              </button>
            </Link>
          )}
        </header>

        <main className="flex-1 overflow-auto p-8">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
            {kpiCards.map((card) => {
              const Icon = card.icon;
              const isActive =
                card.filter &&
                status === card.filter;

              return (
                <div
                  key={card.label}
                  onClick={() =>
                    card.filter &&
                    setStatus(card.filter)
                  }
                  className={`bg-white rounded-2xl p-5 shadow-sm border transition-all ${
                    card.filter
                      ? "cursor-pointer hover:shadow-md"
                      : ""
                  } ${
                    isActive
                      ? "border-indigo-400 ring-2 ring-indigo-100"
                      : "border-gray-100"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-11 h-11 rounded-2xl ${card.color} flex items-center justify-center`}
                    >
                      <Icon
                        className={`w-5 h-5 ${card.iconColor}`}
                      />
                    </div>
                  </div>

                  <p className="text-3xl font-bold text-gray-900 mb-1">
                    {card.value}
                  </p>

                  <p className="text-sm text-gray-500">
                    {card.label}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />

                <input
                  type="text"
                  placeholder="Search job title or department..."
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent bg-gray-50"
                />
              </div>

              {[
                {
                  value: status,
                  setter: setStatus,
                  options: STATUSES,
                },
                {
                  value: workMode,
                  setter: setWorkMode,
                  options: WORK_MODES,
                },
              ].map((f, i) => (
                <div
                  key={i}
                  className="relative"
                >
                  <select
                    value={f.value}
                    onChange={(e) =>
                      f.setter(e.target.value)
                    }
                    className="appearance-none pl-4 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 text-gray-600 cursor-pointer"
                  >
                    {f.options.map((o) => (
                      <option key={o}>
                        {o}
                      </option>
                    ))}
                  </select>

                  <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {[
                      "Job Title",
                      "Department",
                      "Employment Type",
                      "Work Mode",
                      "Experience",
                      "Openings",
                      "Deadline",
                      "Status",
                      "Actions",
                    ].map((col) => (
                      <th
                        key={col}
                        className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-6 py-16 text-center text-sm text-gray-400"
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-6 py-16 text-center"
                      >
                        <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-3" />

                        <p className="text-gray-400 font-medium">
                          No job descriptions
                          found
                        </p>

                        <p className="text-gray-300 text-sm mt-1">
                          Try adjusting your
                          filters or add a new
                          job
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((job) => {
                      const badge =
                        STATUS_CONFIG[
                          job.status
                        ] ||
                        STATUS_CONFIG.Draft;

                      return (
                        <tr
                          key={job.id}
                          className="hover:bg-gray-200 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                <Briefcase className="w-4 h-4 text-indigo-500" />
                              </div>

                              <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                                {job.title}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">
                              {job.department}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600 whitespace-nowrap">
                              {
                                job.employment_type
                              }
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`text-xs font-medium px-2.5 py-1 rounded-lg whitespace-nowrap ${
                                job.work_mode ===
                                "Remote"
                                  ? "bg-blue-50 text-blue-600"
                                  : job.work_mode ===
                                      "Hybrid"
                                    ? "bg-purple-50 text-purple-600"
                                    : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {job.work_mode}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600 whitespace-nowrap">
                              {job.experience}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-gray-700">
                              {job.openings}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-500 whitespace-nowrap">
                              {new Date(
                                job.deadline
                              ).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${badge.bg} ${badge.text}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}
                              />

                              {job.status}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() =>
                                  setViewJob(job)
                                }
                                className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                title="View"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {canAnalyze && <button
                                onClick={() =>
                                  handleAnalyze(job)
                                }
                                disabled={
                                  analyzingId ===
                                  job.id
                                }
                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Analyze Job Description"
                              >
                                {analyzingId ===
                                job.id ? (
                                  <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin block" />
                                ) : (
                                  <Sparkles className="w-4 h-4" />
                                )}
                              </button>}

                              {canView && <button
                                onClick={() => handleViewSavedAnalysis(job)}
                                disabled={viewingAnalysisId === job.id}
                                className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                title="View Saved Analysis"
                              >
                                {viewingAnalysisId === job.id ? (
                                  <span className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin block" />
                                ) : (
                                  <BarChart3 className="w-4 h-4" />
                                )}
                              </button>}

                              {canEdit && <Link
                                href={`/Recruitment/job-description/${job.id}`}
                              >
                                <button
                                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              </Link>}

                              {canClose && (
                                <button
                                  onClick={() => !pendingCloseAudits[job.id] && job.status !== "Closed" && setDeleteJob(job)}
                                  disabled={!!pendingCloseAudits[job.id] || job.status === "Closed"}
                                  title={job.status === "Closed" ? "Job already closed" : pendingCloseAudits[job.id] ? "Waiting for auditor approval" : "Close job"}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
                                >
                                  <Lock className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              total={filtered.length}
              page={page}
              perPage={perPage}
              onPageChange={setPage}
              onPerPageChange={setPerPage}
            />
          </div>
        </main>
      </div>

      {/* View Drawer */}
      {viewJob && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
            onClick={() => setViewJob(null)}
          />

          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      (
                        STATUS_CONFIG[
                          viewJob.status
                        ] ||
                        STATUS_CONFIG.Draft
                      ).bg
                    } ${
                      (
                        STATUS_CONFIG[
                          viewJob.status
                        ] ||
                        STATUS_CONFIG.Draft
                      ).text
                    }`}
                  >
                    {viewJob.status}
                  </span>

                  <h2 className="text-2xl font-bold text-white mt-2">
                    {viewJob.title}
                  </h2>

                  <p className="text-indigo-200 text-sm mt-1">
                    {viewJob.department}
                  </p>
                </div>

                <button
                  onClick={() =>
                    setViewJob(null)
                  }
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors cursor-pointer text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {[
                  viewJob.employment_type,
                  viewJob.work_mode,
                  viewJob.experience,
                  `${viewJob.openings} Opening${
                    viewJob.openings > 1
                      ? "s"
                      : ""
                  }`,
                ].map((label) => (
                  <span
                    key={label}
                    className="text-xs font-medium bg-white/20 text-white px-3 py-1 rounded-full"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    label: "Department",
                    value:
                      viewJob.department,
                  },
                  {
                    label: "Employment Type",
                    value:
                      viewJob.employment_type,
                  },
                  {
                    label: "Work Mode",
                    value:
                      viewJob.work_mode,
                  },
                  {
                    label: "Experience",
                    value:
                      viewJob.experience,
                  },
                  {
                    label: "Openings",
                    value: viewJob.openings,
                  },
                  {
                    label: "Hiring Manager",
                    value:
                      viewJob.hiring_manager,
                  },
                  {
                    label: "Location",
                    value: viewJob.location,
                  },
                  {
                    label: "Deadline",
                    value:
                      new Date(
                        viewJob.deadline
                      ).toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        }
                      ),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-gray-50 rounded-xl p-4"
                  >
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                      {item.label}
                    </p>

                    <p className="text-sm font-semibold text-gray-800">
                      {String(
                        item.value ?? ""
                      )}
                    </p>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-indigo-500 rounded-full inline-block" />
                  Job Summary
                </h3>

                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4">
                  {viewJob.summary}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-indigo-500 rounded-full inline-block" />
                  Responsibilities
                </h3>

                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4 whitespace-pre-line">
                  {viewJob.responsibilities}
                </p>
              </div>

              {viewJob.required_skills?.length >
                0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-green-500 rounded-full inline-block" />
                    Required Skills
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {viewJob.required_skills.map(
                      (skill) => (
                        <span
                          key={skill}
                          className="text-xs font-medium bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg"
                        >
                          {skill}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

              {viewJob.preferred_skills?.length >
                0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-purple-500 rounded-full inline-block" />
                    Preferred Skills
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {viewJob.preferred_skills.map(
                      (skill) => (
                        <span
                          key={skill}
                          className="text-xs font-medium bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg"
                        >
                          {skill}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

              {(viewJob.salary_min ||
                viewJob.salary_max) && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    Salary Range
                  </p>

                  <p className="text-sm font-semibold text-gray-800">
                    {viewJob.salary_min} —{" "}
                    {viewJob.salary_max}
                  </p>
                </div>
              )}

              {viewJob.benefits && (
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <span className="w-1 h-4 bg-amber-500 rounded-full inline-block" />
                    Benefits & Perks
                  </h3>

                  <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4 whitespace-pre-line">
                    {viewJob.benefits}
                  </p>
                </div>
              )}

              {viewJob.interview_process && (
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <span className="w-1 h-4 bg-blue-500 rounded-full inline-block" />
                    Interview Process
                  </h3>

                  <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4 whitespace-pre-line">
                    {
                      viewJob.interview_process
                    }
                  </p>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
                    Application Deadline
                  </p>

                  <p className="text-sm font-bold text-amber-800 mt-0.5">
                    {new Date(
                      viewJob.deadline
                    ).toLocaleDateString(
                      "en-IN",
                      {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      }
                    )}
                  </p>
                </div>

                <span className="text-2xl">
                  📅
                </span>
              </div>
            </div>

            <div className="px-8 py-4 border-t border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
              <button
                onClick={() =>
                  setViewJob(null)
                }
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Close
              </button>

              {canEdit && <Link href={`/Recruitment/job-description/${viewJob.id}`}>
                <button className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer">
                  <Pencil className="w-4 h-4" />
                  Edit Job
                </button>
              </Link>}
            </div>
          </div>
        </>
      )}

      {/* Close Job Modal */}
      {deleteJob && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
            onClick={() => setDeleteJob(null)}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-50">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <button
                  onClick={() => setDeleteJob(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
                Close Job Description
              </h2>

              <p className="text-sm text-gray-500 text-center mb-1">
                You are about to close the Job Description
              </p>

              <p className="text-sm font-semibold text-gray-800 text-center mb-4">
                &quot;{deleteJob.title}&quot;
              </p>

              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-6">
                <p className="text-xs text-red-600 text-center leading-relaxed">
                  This will mark the job as Closed and it will no longer be active.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteJob(null)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Lock className="w-4 h-4" />
                  {deleting ? "Submitting..." : "Yes, Close"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Job Analysis Drawer */}
      {analysis && analysisJob && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
            onClick={() => {
              if (
                !savingAnalysis &&
                !analyzingId
              ) {
                setAnalysis(null);
                setAnalysisJob(null);
              }
            }}
          />

          <div className="fixed top-0 right-0 h-full w-full max-w-4xl bg-white z-50 shadow-2xl flex flex-col">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider">
                    Job Description Analysis
                  </p>

                  <h2 className="text-2xl font-bold text-white mt-1">
                    {analysisJob.title}
                  </h2>

                  <p className="text-indigo-200 text-sm mt-1">
                    {analysisJob.department}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setAnalysis(null);
                    setAnalysisJob(null);
                  }}
                  className="p-2 hover:bg-white/20 rounded-xl text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6">
              <div className="space-y-6">
                <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    [
                      "Overall quality",
                      analysis.qualityScore
                        ?.overall,
                    ],
                    [
                      "Completeness",
                      analysis.qualityScore
                        ?.completeness,
                    ],
                    [
                      "Readability",
                      analysis.qualityScore
                        ?.readability,
                    ],
                    [
                      "ATS friendly",
                      analysis.qualityScore
                        ?.atsFriendliness,
                    ],
                    [
                      "Bias-free language",
                      analysis.qualityScore
                        ?.biasFreeLanguage,
                    ],
                    [
                      "Keyword optimization",
                      analysis.qualityScore
                        ?.keywordOptimization,
                    ],
                  ].map(
                    ([label, score]) => (
                      <div
                        key={String(label)}
                        className="bg-indigo-50 border border-indigo-100 rounded-xl p-4"
                      >
                        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">
                          {label}
                        </p>

                        <p className="text-2xl font-bold text-indigo-700 mt-1">
                          {score ?? 0}
                          <span className="text-sm font-medium">
                            /100
                          </span>
                        </p>
                      </div>
                    )
                  )}
                </section>

                <section className="bg-gray-50 border border-gray-100 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-gray-800 mb-4">
                    Job overview
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      [
                        "Job title",
                        analysis.jobInformation
                          ?.jobTitle,
                      ],
                      [
                        "Department",
                        analysis.jobInformation
                          ?.department,
                      ],
                      [
                        "Employment",
                        analysis.jobInformation
                          ?.employmentType,
                      ],
                      [
                        "Work mode",
                        analysis.jobInformation
                          ?.workMode,
                      ],
                      [
                        "Location",
                        analysis.jobInformation
                          ?.location,
                      ],
                      [
                        "Experience",
                        analysis
                          .experienceAnalysis
                          ?.minimumExperience ||
                          analysis
                            .jobInformation
                            ?.minimumExperience,
                      ],
                      [
                        "Education",
                        analysis.jobInformation
                          ?.educationQualification,
                      ],
                      [
                        "Salary",
                        [
                          analysis
                            .jobInformation
                            ?.salaryMinimum,
                          analysis
                            .jobInformation
                            ?.salaryMaximum,
                        ]
                          .filter(Boolean)
                          .join(" - "),
                      ],
                    ].map(
                      ([label, value]) => (
                        <div key={String(label)}>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            {label}
                          </p>

                          <p className="text-sm font-semibold text-gray-800 mt-1">
                            {value ||
                              "Not provided"}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnalysisList
                    title="Mandatory skills"
                    items={
                      analysis.skillsAnalysis
                        ?.mandatorySkills
                    }
                    icon={ListChecks}
                    color="green"
                  />

                  <AnalysisList
                    title="Preferred skills"
                    items={
                      analysis.skillsAnalysis
                        ?.preferredSkills
                    }
                    icon={Target}
                    color="blue"
                  />

                  <AnalysisList
                    title="Soft skills"
                    items={
                      analysis.skillsAnalysis
                        ?.softSkills
                    }
                    icon={ShieldCheck}
                    color="purple"
                  />

                  <AnalysisList
                    title="Certifications"
                    items={
                      analysis.educationAnalysis
                        ?.certifications
                    }
                    icon={ListChecks}
                    color="amber"
                  />
                </div>

                <section className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-800 mb-4">
                    ATS keywords
                  </h3>

                  <div className="space-y-3">
                    {[
                      {
                        label: "Technical",
                        items: analysis.keywords
                          ?.technical,
                      },
                      {
                        label: "Functional",
                        items: analysis.keywords
                          ?.functional,
                      },
                      {
                        label: "Industry",
                        items: analysis.keywords
                          ?.industry,
                      },
                      {
                        label: "Role-based",
                        items: analysis.keywords
                          ?.roleBased,
                      },
                    ].map(
                      ({ label, items }) =>
                        asList(items).length >
                          0 && (
                          <div
                            key={String(label)}
                            className="flex flex-col sm:flex-row gap-2 sm:items-start"
                          >
                            <span className="w-28 flex-shrink-0 text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">
                              {label}
                            </span>

                            <div className="flex flex-wrap gap-2">
                              {asList(items).map(
                                (
                                  item,
                                  index
                                ) => (
                                  <span
                                    key={`${String(
                                      label
                                    )}-${index}`}
                                    className="text-sm bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg"
                                  >
                                    {readableItem(
                                      item
                                    )}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )
                    )}
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnalysisList
                    title="Primary responsibilities"
                    items={
                      analysis.responsibilities
                        ?.primary
                    }
                    icon={ListChecks}
                    color="indigo"
                  />

                  <AnalysisList
                    title="Leadership responsibilities"
                    items={
                      analysis.responsibilities
                        ?.leadership
                    }
                    icon={ShieldCheck}
                    color="orange"
                  />

                  <AnalysisList
                    title="Missing information"
                    items={
                      analysis.missingInformation
                    }
                    icon={AlertCircle}
                    color="red"
                  />

                  <AnalysisList
                    title="ATS suggestions"
                    items={
                      analysis.atsSuggestions
                    }
                    icon={Target}
                    color="teal"
                  />
                </div>

                {analysis.biasDetection
                  ?.detected && (
                  <section className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-amber-800 mb-3">
                      <AlertCircle className="w-4 h-4" />
                      Potentially biased
                      language
                    </h3>

                    <div className="space-y-2 text-sm text-amber-900">
                      {asList(
                        analysis.biasDetection
                          .issues
                      ).map(
                        (issue, index) => (
                          <p key={index}>
                            {readableItem(
                              issue
                            )}
                          </p>
                        )
                      )}
                    </div>
                  </section>
                )}

                <section className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-slate-800 mb-3">
                    Candidate matching criteria
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500">
                        Experience weight
                      </span>

                      <p className="font-bold text-slate-800">
                        {analysis.matchingCriteria
                          ?.experienceWeightage ??
                          0}
                        %
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500">
                        Education weight
                      </span>

                      <p className="font-bold text-slate-800">
                        {analysis.matchingCriteria
                          ?.educationWeightage ??
                          0}
                        %
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500">
                        Certification weight
                      </span>

                      <p className="font-bold text-slate-800">
                        {analysis.matchingCriteria
                          ?.certificationWeightage ??
                          0}
                        %
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Required skills
                    </p>

                    <p className="text-sm text-slate-700">
                      {asList(
                        analysis.matchingCriteria
                          ?.requiredSkills
                      )
                        .map(readableItem)
                        .join(", ") ||
                        "Not provided"}
                    </p>
                  </div>
                </section>
              </div>
            </div>

            <div className="px-8 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
              {canAnalyze && (
                <>
                  <button
                    onClick={handleReAnalyze}
                    disabled={
                      analyzingId ===
                        analysisJob.id ||
                      savingAnalysis
                    }
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />

                    {analyzingId ===
                    analysisJob.id
                      ? "Re-analyzing..."
                      : "Re-analyze"}
                  </button>

                  <button
                    onClick={handleSaveAnalysis}
                    disabled={
                      savingAnalysis ||
                      analyzingId ===
                        analysisJob.id
                    }
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {savingAnalysis
                      ? "Saving..."
                      : "Save Analysis"}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
      {savedAnalysis && savedAnalysisJob && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
            onClick={() => { setSavedAnalysis(null); setSavedAnalysisJob(null); }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-4xl bg-white z-50 shadow-2xl flex flex-col">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-6 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-purple-200 text-xs font-semibold uppercase tracking-wider">Saved Analysis</p>
                  <h2 className="text-2xl font-bold text-white mt-1">{savedAnalysisJob.title}</h2>
                  <p className="text-purple-200 text-sm mt-1">{savedAnalysisJob.department}</p>
                </div>
                <button onClick={() => { setSavedAnalysis(null); setSavedAnalysisJob(null); }} className="p-2 hover:bg-white/20 rounded-xl text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <div className="space-y-6">
                <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    ["Overall quality", savedAnalysis.qualityScore?.overall],
                    ["Completeness", savedAnalysis.qualityScore?.completeness],
                    ["Readability", savedAnalysis.qualityScore?.readability],
                    ["ATS friendly", savedAnalysis.qualityScore?.atsFriendliness],
                    ["Bias-free language", savedAnalysis.qualityScore?.biasFreeLanguage],
                    ["Keyword optimization", savedAnalysis.qualityScore?.keywordOptimization],
                  ].map(([label, score]) => (
                    <div key={String(label)} className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                      <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide">{label}</p>
                      <p className="text-2xl font-bold text-purple-700 mt-1">{score ?? 0}<span className="text-sm font-medium">/100</span></p>
                    </div>
                  ))}
                </section>
                <section className="bg-gray-50 border border-gray-100 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-gray-800 mb-4">Job overview</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      ["Job title", savedAnalysis.jobInformation?.jobTitle],
                      ["Department", savedAnalysis.jobInformation?.department],
                      ["Employment", savedAnalysis.jobInformation?.employmentType],
                      ["Work mode", savedAnalysis.jobInformation?.workMode],
                      ["Location", savedAnalysis.jobInformation?.location],
                      ["Experience", savedAnalysis.jobInformation?.minimumExperience],
                      ["Education", savedAnalysis.jobInformation?.educationQualification],
                      ["Salary", [savedAnalysis.jobInformation?.salaryMinimum, savedAnalysis.jobInformation?.salaryMaximum].filter(Boolean).join(" - ")],
                    ].map(([label, value]) => (
                      <div key={String(label)}>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                        <p className="text-sm font-semibold text-gray-800 mt-1">{value || "Not provided"}</p>
                      </div>
                    ))}
                  </div>
                </section>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnalysisList title="Mandatory skills" items={savedAnalysis.skillsAnalysis?.mandatorySkills} icon={ListChecks} color="green" />
                  <AnalysisList title="Preferred skills" items={savedAnalysis.skillsAnalysis?.preferredSkills} icon={Target} color="blue" />
                  <AnalysisList title="Soft skills" items={savedAnalysis.skillsAnalysis?.softSkills} icon={ShieldCheck} color="purple" />
                  <AnalysisList title="Certifications" items={savedAnalysis.educationAnalysis?.certifications} icon={ListChecks} color="amber" />
                </div>
                <section className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-800 mb-4">ATS keywords</h3>
                  <div className="space-y-3">
                    {[
                      { label: "Technical", items: savedAnalysis.keywords?.technical },
                      { label: "Functional", items: savedAnalysis.keywords?.functional },
                      { label: "Industry", items: savedAnalysis.keywords?.industry },
                      { label: "Role-based", items: savedAnalysis.keywords?.roleBased },
                    ].map(({ label, items }) => asList(items).length > 0 && (
                      <div key={label} className="flex flex-col sm:flex-row gap-2 sm:items-start">
                        <span className="w-28 flex-shrink-0 text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">{label}</span>
                        <div className="flex flex-wrap gap-2">
                          {asList(items).map((item, i) => (
                            <span key={i} className="text-sm bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg">{readableItem(item)}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnalysisList title="Primary responsibilities" items={savedAnalysis.responsibilities?.primary} icon={ListChecks} color="indigo" />
                  <AnalysisList title="Leadership responsibilities" items={savedAnalysis.responsibilities?.leadership} icon={ShieldCheck} color="orange" />
                  <AnalysisList title="Missing information" items={savedAnalysis.missingInformation} icon={AlertCircle} color="red" />
                  <AnalysisList title="ATS suggestions" items={savedAnalysis.atsSuggestions} icon={Target} color="teal" />
                </div>
                {savedAnalysis.biasDetection?.detected && (
                  <section className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-amber-800 mb-3">
                      <AlertCircle className="w-4 h-4" />Potentially biased language
                    </h3>
                    <div className="space-y-2 text-sm text-amber-900">
                      {asList(savedAnalysis.biasDetection.issues).map((issue, i) => (
                        <p key={i}>{readableItem(issue)}</p>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
            <div className="px-8 py-4 border-t border-gray-100 bg-white flex justify-between items-center">
              <p className="text-xs text-gray-400">This is the last saved analysis for this job.</p>
              <button
                onClick={() => { setSavedAnalysis(null); setSavedAnalysisJob(null); }}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}