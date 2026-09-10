import { useEffect, useMemo, useState } from "react";
import SideBar from "@/Components/SideBar";
import Link from "next/link";
import {
  BriefcaseBusiness,
  Users,
  UserCheck,
  UserX,
  Clock3,
  CalendarDays,
  Target,
  TrendingUp,
  ArrowUpRight,
  Plus,
  FileText,
  BarChart3,
  Building2,
  MapPin,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  CircleDot,
  Layers3,
} from "lucide-react";

const safeArray = (value) => (Array.isArray(value) ? value : []);

const getStatus = (value) =>
  String(value || "").toLowerCase().trim();

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN").format(Number(value) || 0);

const getScore = (candidate) => {
  const score = Number(candidate?.matchingScore);
  return Number.isFinite(score) ? score : 0;
};

export default function RecruitmentAnalytics() {
  const [jobs, setJobs] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAnalytics = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [jobsResponse, dashboardResponse] = await Promise.all([
        fetch("/api/recruitment/job-description"),
        fetch("/api/recruitment/job-applications/dashboard"),
      ]);

      const jobsData = await jobsResponse.json();
      const dashboardData = await dashboardResponse.json();

      if (!jobsResponse.ok) {
        throw new Error(
          jobsData?.error || "Unable to load job descriptions"
        );
      }

      if (!dashboardResponse.ok) {
        throw new Error(
          dashboardData?.error || "Unable to load recruitment data"
        );
      }

      setJobs(
        safeArray(jobsData?.jobs || jobsData?.data)
      );

      setResumes(
        safeArray(
          dashboardData?.resumes ||
            dashboardData?.data?.resumes
        )
      );
    } catch (err) {
      console.error("Analytics error:", err);

      setError(
        err.message ||
          "Something went wrong while loading analytics."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const analytics = useMemo(() => {
    const totalJobs = jobs.length;

    const publishedJobs = jobs.filter(
      (job) =>
        getStatus(job.status) === "published"
    ).length;

    const draftJobs = jobs.filter(
      (job) =>
        getStatus(job.status) === "draft"
    ).length;

    const closedJobs = jobs.filter(
      (job) =>
        getStatus(job.status) === "closed"
    ).length;

    const totalOpenings = jobs.reduce(
      (sum, job) =>
        sum + (Number(job.openings) || 0),
      0
    );

    const totalCandidates = resumes.length;

    const waitingCandidates = resumes.filter(
      (candidate) => {
        const status = getStatus(
          candidate.applicationStatus
        );

        return (
          status === "waiting" ||
          status === ""
        );
      }
    ).length;

    const shortlistedCandidates = resumes.filter(
      (candidate) => {
        const status = getStatus(
          candidate.applicationStatus
        );

        return (
          status === "shortlisted" ||
          status === "shortlist"
        );
      }
    ).length;

    const rejectedCandidates = resumes.filter(
      (candidate) => {
        const status = getStatus(
          candidate.applicationStatus
        );

        return (
          status === "rejected" ||
          status === "reject"
        );
      }
    ).length;

    const interviewCandidates = resumes.filter(
      (candidate) =>
        candidate?.interviewScheduled === true ||
        getStatus(candidate?.applicationStatus) ===
          "interview"
    ).length;

    const scores = resumes
      .map(getScore)
      .filter((score) => score > 0);

    const averageScore =
      scores.length > 0
        ? Math.round(
            scores.reduce(
              (sum, score) => sum + score,
              0
            ) / scores.length
          )
        : 0;

    const highMatchCandidates = resumes.filter(
      (candidate) =>
        getScore(candidate) >= 80
    ).length;

    const mediumMatchCandidates = resumes.filter(
      (candidate) => {
        const score = getScore(candidate);

        return (
          score >= 60 &&
          score < 80
        );
      }
    ).length;

    const lowMatchCandidates = resumes.filter(
      (candidate) => {
        const score = getScore(candidate);

        return (
          score > 0 &&
          score < 60
        );
      }
    ).length;

    const shortlistRate =
      totalCandidates > 0
        ? Math.round(
            (shortlistedCandidates /
              totalCandidates) *
              100
          )
        : 0;

    const candidatesPerOpening =
      totalOpenings > 0
        ? (
            totalCandidates /
            totalOpenings
          ).toFixed(1)
        : "0";

    /* -----------------------------
       DEPARTMENT DATA
    ----------------------------- */

    const departmentMap = {};

    jobs.forEach((job) => {
      const department =
        job.department || "Other";

      if (!departmentMap[department]) {
        departmentMap[department] = {
          name: department,
          jobs: 0,
          openings: 0,
        };
      }

      departmentMap[department].jobs += 1;

      departmentMap[department].openings +=
        Number(job.openings) || 0;
    });

    const departments = Object.values(
      departmentMap
    )
      .sort(
        (a, b) =>
          b.jobs - a.jobs
      )
      .slice(0, 6);

    /* -----------------------------
       WORK MODE DATA
    ----------------------------- */

    const workModeMap = {};

    jobs.forEach((job) => {
      const mode =
        job.work_mode ||
        job.workMode ||
        "Not specified";

      if (!workModeMap[mode]) {
        workModeMap[mode] = 0;
      }

      workModeMap[mode] += 1;
    });

    const workModes = Object.entries(
      workModeMap
    )
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort(
        (a, b) =>
          b.count - a.count
      );

    /* -----------------------------
       JOB PERFORMANCE
    ----------------------------- */

    const jobPerformance = jobs
      .map((job) => {
        const jobCandidates =
          resumes.filter(
            (candidate) =>
              Number(
                candidate.jobDescriptionId
              ) === Number(job.id)
          );

        const scoresForJob =
          jobCandidates
            .map(getScore)
            .filter(
              (score) => score > 0
            );

        const jobAverageScore =
          scoresForJob.length > 0
            ? Math.round(
                scoresForJob.reduce(
                  (sum, score) =>
                    sum + score,
                  0
                ) /
                  scoresForJob.length
              )
            : 0;

        const shortlisted =
          jobCandidates.filter(
            (candidate) => {
              const status =
                getStatus(
                  candidate.applicationStatus
                );

              return (
                status ===
                  "shortlisted" ||
                status ===
                  "shortlist"
              );
            }
          ).length;

        return {
          ...job,
          candidateCount:
            jobCandidates.length,
          shortlisted,
          averageScore:
            jobAverageScore,
          openings:
            Number(job.openings) || 0,
        };
      })
      .sort(
        (a, b) =>
          b.candidateCount -
          a.candidateCount
      )
      .slice(0, 5);

    return {
      totalJobs,
      publishedJobs,
      draftJobs,
      closedJobs,
      totalOpenings,
      totalCandidates,
      waitingCandidates,
      shortlistedCandidates,
      rejectedCandidates,
      interviewCandidates,
      averageScore,
      highMatchCandidates,
      mediumMatchCandidates,
      lowMatchCandidates,
      shortlistRate,
      candidatesPerOpening,
      departments,
      workModes,
      jobPerformance,
    };
  }, [jobs, resumes]);

  /* -----------------------------
     LOADING
  ----------------------------- */

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />

        <div className="min-w-0 flex-1 bg-[#f6f8fb]">
          <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
            <div className="animate-pulse space-y-6">
              <div className="h-40 rounded-[28px] bg-slate-200" />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map(
                  (item) => (
                    <div
                      key={item}
                      className="h-36 rounded-2xl bg-slate-200"
                    />
                  )
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="h-80 rounded-3xl bg-slate-200 xl:col-span-2" />
                <div className="h-80 rounded-3xl bg-slate-200" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* -----------------------------
     ERROR
  ----------------------------- */

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />

        <div className="min-w-0 flex-1 bg-[#f6f8fb]">
          <div className="mx-auto flex min-h-screen w-full max-w-[1500px] items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
            <div className="w-full max-w-2xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
                <RefreshCw className="h-6 w-6 text-red-500" />
              </div>

              <h2 className="text-xl font-bold text-slate-900">
                Unable to load analytics
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {error}
              </p>

              <button
                onClick={() =>
                  loadAnalytics()
                }
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const maxDepartmentJobs =
    Math.max(
      ...analytics.departments.map(
        (item) => item.jobs
      ),
      1
    );

  const maxWorkModeCount =
    Math.max(
      ...analytics.workModes.map(
        (item) => item.count
      ),
      1
    );

  const score =
    analytics.averageScore;

  const scoreGradient = {
    background: `conic-gradient(#0f172a ${
      score * 3.6
    }deg, #e2e8f0 ${
      score * 3.6
    }deg)`,
  };

  /* =============================
     MAIN PAGE
  ============================= */

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* SIDEBAR */}
      <SideBar />

      {/* MAIN CONTENT */}
      <div className="min-w-0 flex-1 bg-[#f6f8fb]">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">

          {/* =========================
              HEADER
          ========================= */}

          <div className="relative overflow-hidden rounded-[28px] bg-slate-500 p-7 shadow-xl sm:p-9">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-900/20 blur-3xl" />

            <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
                  <Sparkles className="h-3.5 w-3.5" />

                  Recruitment Command Center
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Recruitment Analytics
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                  Track your hiring pipeline,
                  job performance and candidate
                  quality from one place.
                </p>
              </div>

              {/* HEADER BUTTONS */}

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() =>
                    loadAnalytics(true)
                  }
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      refreshing
                        ? "animate-spin"
                        : ""
                    }`}
                  />

                  Refresh
                </button>

                <Link
                  href="/Recruitment/job-description/add"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4" />

                  Create Job
                </Link>
              </div>
            </div>
          </div>

          {/* =========================
              KPI CARDS
          ========================= */}

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              href="/Recruitment/job-description"
              icon={BriefcaseBusiness}
              title="Total Jobs"
              value={analytics.totalJobs}
              subtitle={`${analytics.publishedJobs} currently published`}
              iconClass="bg-indigo-50 text-indigo-600"
            />

            <MetricCard
              href="/Recruitment/job-applications"
              icon={Users}
              title="Total Candidates"
              value={analytics.totalCandidates}
              subtitle={`${analytics.candidatesPerOpening} candidates per opening`}
              iconClass="bg-blue-50 text-blue-600"
            />

            <MetricCard
              href="/Recruitment/job-applications"
              icon={Target}
              title="Average Match"
              value={`${analytics.averageScore}%`}
              subtitle={`${analytics.highMatchCandidates} high-match candidates`}
              iconClass="bg-emerald-50 text-emerald-600"
            />

            <MetricCard
              href="/Recruitment/job-description"
              icon={Layers3}
              title="Open Positions"
              value={analytics.totalOpenings}
              subtitle={`${analytics.draftJobs} draft jobs`}
              iconClass="bg-amber-50 text-amber-600"
            />
          </div>

          {/* =========================
              MAIN ANALYTICS
          ========================= */}

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">

            {/* PIPELINE */}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Recruitment Pipeline
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Current candidate movement
                  </p>
                </div>

                <Link
                  href="/Recruitment/job-applications"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-950"
                >
                  View Applications

                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
                <PipelineCard
                  icon={Users}
                  label="Candidates"
                  value={analytics.totalCandidates}
                  percentage={100}
                  className="bg-slate-50"
                />

                <PipelineCard
                  icon={Clock3}
                  label="Waiting"
                  value={analytics.waitingCandidates}
                  percentage={
                    analytics.totalCandidates
                      ? Math.round(
                          (analytics.waitingCandidates /
                            analytics.totalCandidates) *
                            100
                        )
                      : 0
                  }
                  className="bg-amber-50"
                />

                <PipelineCard
                  icon={UserCheck}
                  label="Shortlisted"
                  value={analytics.shortlistedCandidates}
                  percentage={
                    analytics.totalCandidates
                      ? Math.round(
                          (analytics.shortlistedCandidates /
                            analytics.totalCandidates) *
                            100
                        )
                      : 0
                  }
                  className="bg-emerald-50"
                />

                <PipelineCard
                  icon={CalendarDays}
                  label="Interview"
                  value={analytics.interviewCandidates}
                  percentage={
                    analytics.totalCandidates
                      ? Math.round(
                          (analytics.interviewCandidates /
                            analytics.totalCandidates) *
                            100
                        )
                      : 0
                  }
                  className="bg-blue-50"
                />

                <PipelineCard
                  icon={UserX}
                  label="Rejected"
                  value={analytics.rejectedCandidates}
                  percentage={
                    analytics.totalCandidates
                      ? Math.round(
                          (analytics.rejectedCandidates /
                            analytics.totalCandidates) *
                            100
                        )
                      : 0
                  }
                  className="bg-red-50"
                />
              </div>

              {/* PIPELINE BAR */}

              <div className="mt-8">
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>
                    Candidate distribution
                  </span>

                  <span>
                    {analytics.totalCandidates} total
                  </span>
                </div>

                <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                  {analytics.waitingCandidates >
                    0 && (
                    <div
                      className="bg-amber-400"
                      style={{
                        width: `${
                          (analytics.waitingCandidates /
                            Math.max(
                              analytics.totalCandidates,
                              1
                            )) *
                          100
                        }%`,
                      }}
                    />
                  )}

                  {analytics.shortlistedCandidates >
                    0 && (
                    <div
                      className="bg-emerald-500"
                      style={{
                        width: `${
                          (analytics.shortlistedCandidates /
                            Math.max(
                              analytics.totalCandidates,
                              1
                            )) *
                          100
                        }%`,
                      }}
                    />
                  )}

                  {analytics.interviewCandidates >
                    0 && (
                    <div
                      className="bg-blue-500"
                      style={{
                        width: `${
                          (analytics.interviewCandidates /
                            Math.max(
                              analytics.totalCandidates,
                              1
                            )) *
                          100
                        }%`,
                      }}
                    />
                  )}

                  {analytics.rejectedCandidates >
                    0 && (
                    <div
                      className="bg-red-400"
                      style={{
                        width: `${
                          (analytics.rejectedCandidates /
                            Math.max(
                              analytics.totalCandidates,
                              1
                            )) *
                          100
                        }%`,
                      }}
                    />
                  )}
                </div>
              </div>
            </section>

            {/* MATCH QUALITY */}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Match Quality
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Candidate-to-JD matching
                  </p>
                </div>

                <Target className="h-5 w-5 text-slate-400" />
              </div>

              <div className="mt-7 flex justify-center">
                <div
                  className="relative flex h-44 w-44 items-center justify-center rounded-full"
                  style={scoreGradient}
                >
                  <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white">
                    <span className="text-4xl font-bold tracking-tight text-slate-900">
                      {score}%
                    </span>

                    <span className="mt-1 text-xs font-medium text-slate-500">
                      Average Match
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-7 space-y-4">
                <ScoreRow
                  label="High Match"
                  count={
                    analytics.highMatchCandidates
                  }
                  percentage={
                    analytics.totalCandidates
                      ? Math.round(
                          (analytics.highMatchCandidates /
                            analytics.totalCandidates) *
                            100
                        )
                      : 0
                  }
                  indicator="bg-emerald-500"
                />

                <ScoreRow
                  label="Medium Match"
                  count={
                    analytics.mediumMatchCandidates
                  }
                  percentage={
                    analytics.totalCandidates
                      ? Math.round(
                          (analytics.mediumMatchCandidates /
                            analytics.totalCandidates) *
                            100
                        )
                      : 0
                  }
                  indicator="bg-amber-400"
                />

                <ScoreRow
                  label="Low Match"
                  count={
                    analytics.lowMatchCandidates
                  }
                  percentage={
                    analytics.totalCandidates
                      ? Math.round(
                          (analytics.lowMatchCandidates /
                            analytics.totalCandidates) *
                            100
                        )
                      : 0
                  }
                  indicator="bg-red-400"
                />
              </div>
            </section>
          </div>

          {/* =========================
              SECOND ROW
          ========================= */}

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* JOB PERFORMANCE */}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Job Performance
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Jobs receiving the most applications
                  </p>
                </div>

                <Link
                  href="/Recruitment/job-description"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-950"
                >
                  All Jobs

                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-6 space-y-3">
                {analytics.jobPerformance.length ===
                0 ? (
                  <EmptyState text="No jobs available yet." />
                ) : (
                  analytics.jobPerformance.map(
                    (job, index) => (
                      <Link
                        key={job.id}
                        href={`/Recruitment/job-description/${job.id}`}
                        className="group block rounded-2xl border border-slate-100 p-4 transition hover:border-slate-200 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
                            {index + 1}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <h3 className="truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-600">
                                {job.title ||
                                  "Untitled Job"}
                              </h3>

                              <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-indigo-500" />
                            </div>

                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />

                                {job.candidateCount}{" "}
                                candidates
                              </span>

                              <span className="flex items-center gap-1">
                                <BriefcaseBusiness className="h-3.5 w-3.5" />

                                {job.openings} openings
                              </span>

                              <span className="flex items-center gap-1">
                                <Target className="h-3.5 w-3.5" />

                                {job.averageScore}% match
                              </span>
                            </div>

                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-slate-900 transition-all"
                                style={{
                                  width: `${Math.min(
                                    (job.candidateCount /
                                      Math.max(
                                        job.openings,
                                        1
                                      )) *
                                      25,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  )
                )}
              </div>
            </section>

            {/* DEPARTMENTS */}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Department Overview
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Jobs and openings by department
                  </p>
                </div>

                <Building2 className="h-5 w-5 text-slate-400" />
              </div>

              <div className="mt-7 space-y-5">
                {analytics.departments.length ===
                0 ? (
                  <EmptyState text="No department data available." />
                ) : (
                  analytics.departments.map(
                    (department) => (
                      <div
                        key={department.name}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div>
                            <span className="text-sm font-semibold text-slate-800">
                              {department.name}
                            </span>

                            <span className="ml-2 text-xs text-slate-400">
                              {department.openings}{" "}
                              openings
                            </span>
                          </div>

                          <span className="text-sm font-bold text-slate-700">
                            {department.jobs}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-slate-800 transition-all"
                            style={{
                              width: `${
                                (department.jobs /
                                  maxDepartmentJobs) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            </section>
          </div>

          {/* =========================
              THIRD ROW
          ========================= */}

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* WORK MODE */}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Work Modes
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Hiring distribution
                  </p>
                </div>

                <MapPin className="h-5 w-5 text-slate-400" />
              </div>

              <div className="mt-6 space-y-4">
                {analytics.workModes.length ===
                0 ? (
                  <EmptyState text="No work mode data." />
                ) : (
                  analytics.workModes.map(
                    (mode) => (
                      <div
                        key={mode.name}
                        className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm">
                          <MapPin className="h-4 w-4 text-slate-600" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="truncate text-sm font-semibold text-slate-800">
                              {mode.name}
                            </span>

                            <span className="ml-2 text-sm font-bold text-slate-700">
                              {mode.count}
                            </span>
                          </div>

                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-indigo-500"
                              style={{
                                width: `${
                                  (mode.count /
                                    maxWorkModeCount) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            </section>

            {/* RECRUITMENT HEALTH */}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Recruitment Health
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Quick overview of your current hiring activity
                </p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <HealthCard
                  icon={TrendingUp}
                  title="Shortlist Rate"
                  value={`${analytics.shortlistRate}%`}
                  description="of all candidates"
                  href="/Recruitment/job-applications"
                />

                <HealthCard
                  icon={CheckCircle2}
                  title="Published Jobs"
                  value={analytics.publishedJobs}
                  description={`${analytics.totalJobs} total jobs`}
                  href="/Recruitment/job-description"
                />

                <HealthCard
                  icon={FileText}
                  title="Draft Jobs"
                  value={analytics.draftJobs}
                  description="waiting to publish"
                  href="/Recruitment/job-description"
                />

                <HealthCard
                  icon={BarChart3}
                  title="Closed Jobs"
                  value={analytics.closedJobs}
                  description="completed hiring"
                  href="/Recruitment/job-description"
                />
              </div>
            </section>
          </div>

          {/* =========================
              QUICK ACTIONS
          ========================= */}

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Quick Actions
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Jump directly to your recruitment workflow
                </p>
              </div>

              <CircleDot className="h-5 w-5 text-slate-400" />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <QuickAction
                href="/Recruitment/job-description/add"
                icon={Plus}
                title="Create Job"
                description="Create a new job description"
              />

              <QuickAction
                href="/Recruitment/job-description"
                icon={FileText}
                title="Manage Jobs"
                description="View and manage job descriptions"
              />

              <QuickAction
                href="/Recruitment/job-applications"
                icon={Users}
                title="View Candidates"
                description="Review candidate applications"
              />

              <QuickAction
                href="/Recruitment/job-applications"
                icon={BarChart3}
                title="Candidate Matching"
                description="Review AI matching results"
              />
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

/* =====================================================
   COMPONENTS
===================================================== */

function MetricCard({
  href,
  icon: Icon,
  title,
  value,
  subtitle,
  iconClass,
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-700" />
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium text-slate-500">
          {title}
        </p>

        <h3 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          {typeof value === "number"
            ? formatNumber(value)
            : value}
        </h3>

        <p className="mt-1 text-xs text-slate-400">
          {subtitle}
        </p>
      </div>
    </Link>
  );
}

function PipelineCard({
  icon: Icon,
  label,
  value,
  percentage,
  className,
}) {
  return (
    <div
      className={`rounded-2xl p-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-slate-500" />

        <span className="text-xs font-bold text-slate-500">
          {percentage}%
        </span>
      </div>

      <p className="mt-5 text-2xl font-bold text-slate-900">
        {formatNumber(value)}
      </p>

      <p className="mt-1 text-xs font-medium text-slate-500">
        {label}
      </p>
    </div>
  );
}

function ScoreRow({
  label,
  count,
  percentage,
  indicator,
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${indicator}`}
          />

          <span className="text-sm font-medium text-slate-700">
            {label}
          </span>
        </div>

        <span className="text-sm font-semibold text-slate-800">
          {count}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${indicator}`}
          style={{
            width: `${Math.min(
              percentage,
              100
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

function HealthCard({
  icon: Icon,
  title,
  value,
  description,
  href,
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-slate-100 bg-slate-50 p-5 transition hover:border-slate-200 hover:bg-white hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>

        <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-700" />
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-2xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>
    </Link>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 transition group-hover:bg-slate-900 group-hover:text-white">
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900">
          {title}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      </div>

      <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-700" />
    </Link>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
      <p className="text-sm text-slate-400">
        {text}
      </p>
    </div>
  );
}