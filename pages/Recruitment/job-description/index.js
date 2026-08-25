import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import SideBar from "@/Components/SideBar";
import {
  Search, Plus, Pencil, Trash2, Briefcase, Users,
  CheckCircle, XCircle, ChevronDown, Eye, X, AlertTriangle, Lock,Sparkles
} from "lucide-react";
import Pagination from "@/Components/Pagination";
import { toast } from "react-toastify";

const STATUS_CONFIG = {
  Draft:     { bg: "bg-gray-100",  text: "text-gray-600",  dot: "bg-gray-400"  },
  Published: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  Closed:    { bg: "bg-red-100",   text: "text-red-700",   dot: "bg-red-500"   },
};

const STATUSES   = ["All Status", "Draft", "Published", "Closed"];
const WORK_MODES = ["All Work Modes", "Remote", "On-site", "Hybrid"];

export default function JobDescriptions() {
  const [jobs, setJobs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [status, setStatus]       = useState("All Status");
  const [workMode, setWorkMode]   = useState("All Work Modes");
  const [viewJob, setViewJob]     = useState(null);
  const [deleteJob, setDeleteJob] = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisJob, setAnalysisJob] = useState(null);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [savingAnalysis, setSavingAnalysis] = useState(false);
  const [page, setPage]       = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    fetch("/api/recruitment/job-description")
      .then((r) => r.json())
      .then((data) => { setJobs(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

// for closing a job description, we will just update the status to "Closed" instead of deleting it from the database.
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/recruitment/job-description/${deleteJob.id}`, { method: "PATCH" });
      setJobs((prev) => prev.map((j) => j.id === deleteJob.id ? { ...j, status: "Closed" } : j));
      setDeleteJob(null);
    } finally {
      setDeleting(false);
    }
  };
  const handleAnalyze = async (job) => {
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
        throw new Error(result.error || "Failed to analyze job description");
      }

      setAnalysisJob(job);
      setAnalysis(result.data);

    } catch (error) {
      console.error("JD Analysis Error:", error);
      toast.error(error.message || "Failed to analyze job description");
    } finally {
      setAnalyzingId(null);
    }
  };
  const handleReAnalyze = async () => {
    if (!analysisJob) return;

    await handleAnalyze(analysisJob);
  };
  const handleSaveAnalysis = async () => {
    if (!analysisJob || !analysis) return;

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
          result.error || "Failed to save analysis"
        );
      }

      toast.success("Analysis saved successfully.");

      setAnalysis(null);
      setAnalysisJob(null);

    } catch (error) {
      toast.error("Save Analysis Error:", error);

      toast.error(error.message || "Failed to save analysis");
    } finally {
      setSavingAnalysis(false);
    }
  };
  const filtered = jobs.filter((j) => {
    const matchSearch = j.title.toLowerCase().includes(search.toLowerCase()) || j.department.toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === "All Status" || j.status === status;
    const matchMode   = workMode === "All Work Modes" || j.work_mode === workMode;
    return matchSearch && matchStatus && matchMode;
  });

  useEffect(() => { setPage(1); }, [search, status, workMode]);

    const kpiCards = [
    { label: "Total Jobs",     value: jobs.length,                                         icon: Briefcase,   color: "bg-indigo-50", iconColor: "text-indigo-600", filter: "All Status" },
    { label: "Published",      value: jobs.filter((j) => j.status === "Published").length, icon: CheckCircle, color: "bg-green-50",  iconColor: "text-green-600",  filter: "Published"  },
    { label: "Drafts",         value: jobs.filter((j) => j.status === "Draft").length,     icon: XCircle,     color: "bg-gray-50",   iconColor: "text-gray-500",   filter: "Draft"      },
    { label: "Closed Jobs",    value: jobs.filter((j) => j.status === "Closed").length,    icon: Lock,        color: "bg-red-50",    iconColor: "text-red-500",    filter: "Closed"     },
    { label: "Total Openings", value: jobs.filter((j) => j.status !== "Closed").reduce((s, j) => s + (j.openings || 0), 0), icon: Users, color: "bg-purple-50", iconColor: "text-purple-600", filter: "Published" },
  ];
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <Head><title>Job Descriptions - HRMS</title></Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 flex flex-col overflow-hidden">

          <header className="relative z-10 bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between shadow-sm">
            <div>
              <nav className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                <Link href="/Recruitment/recruitment" className="hover:text-indigo-600 transition-colors">Recruitment</Link>
                <span>/</span>
                <span className="text-gray-600 font-medium">Job Descriptions</span>
              </nav>
              <h1 className="text-xl font-bold text-gray-900">Job Descriptions</h1>
              <p className="text-sm text-gray-400 mt-0.5">Create, manage and publish job descriptions.</p>
            </div>
            <Link href="/Recruitment/job-description/add">
              <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-sm shadow-indigo-200 cursor-pointer">
                <Plus className="w-4 h-4" />Add Job
              </button>
            </Link>
          </header>

          <main className="flex-1 overflow-auto p-8">

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
              {kpiCards.map((card) => {
                const Icon = card.icon;
                const isActive = card.filter && status === card.filter;
                return (
                  <div
                    key={card.label}
                    onClick={() => card.filter && setStatus(card.filter)}
                    className={`bg-white rounded-2xl p-5 shadow-sm border transition-all
                      ${card.filter ? "cursor-pointer hover:shadow-md" : ""}
                      ${isActive ? "border-indigo-400 ring-2 ring-indigo-100" : "border-gray-100"}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-11 h-11 rounded-2xl ${card.color} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${card.iconColor}`} />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-1">{card.value}</p>
                    <p className="text-sm text-gray-500">{card.label}</p>
                  </div>
                );
              })}
            </div>


            {/* Table Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">

              {/* Filters */}
              <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search job title or department..." value={search} onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent bg-gray-50" />
                </div>
                {[{ value: status,   setter: setStatus,   options: STATUSES   },
                  { value: workMode, setter: setWorkMode, options: WORK_MODES }].map((f, i) => (
                  <div key={i} className="relative">
                    <select value={f.value} onChange={(e) => f.setter(e.target.value)}
                      className="appearance-none pl-4 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 text-gray-600 cursor-pointer">
                      {f.options.map((o) => <option key={o}>{o}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {["Job Title", "Department", "Employment Type", "Work Mode", "Experience", "Openings", "Deadline", "Status", "Actions"].map((col) => (
                        <th key={col} className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading ? (
                      <tr><td colSpan={9} className="px-6 py-16 text-center text-sm text-gray-400">Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-16 text-center">
                          <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                          <p className="text-gray-400 font-medium">No job descriptions found</p>
                          <p className="text-gray-300 text-sm mt-1">Try adjusting your filters or add a new job</p>
                        </td>
                      </tr>
                    ) : (
                      paginated.map((job) => {
                        const badge = STATUS_CONFIG[job.status] || STATUS_CONFIG.Draft;
                        return (
                          <tr key={job.id} className="hover:bg-gray-200 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                  <Briefcase className="w-4 h-4 text-indigo-500" />
                                </div>
                                <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">{job.title}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4"><span className="text-sm text-gray-600">{job.department}</span></td>
                            <td className="px-6 py-4"><span className="text-sm text-gray-600 whitespace-nowrap">{job.employment_type}</span></td>
                            <td className="px-6 py-4">
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-lg whitespace-nowrap ${
                                job.work_mode === "Remote" ? "bg-blue-50 text-blue-600" :
                                job.work_mode === "Hybrid" ? "bg-purple-50 text-purple-600" :
                                "bg-gray-100 text-gray-600"}`}>
                                {job.work_mode}
                              </span>
                            </td>
                            <td className="px-6 py-4"><span className="text-sm text-gray-600 whitespace-nowrap">{job.experience}</span></td>
                            <td className="px-6 py-4"><span className="text-sm font-medium text-gray-700">{job.openings}</span></td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-500 whitespace-nowrap">
                                {new Date(job.deadline).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${badge.bg} ${badge.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                                {job.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1">
                                <button onClick={() => setViewJob(job)} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer" title="View">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleAnalyze(job)}
                                  disabled={analyzingId === job.id}
                                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Analyze Job Description"
                                >
                                  {analyzingId === job.id ? (
                                    <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin block" />
                                  ) : (
                                    <Sparkles className="w-4 h-4" />
                                  )}
                                </button>
                                <Link href={`/Recruitment/job-description/${job.id}`}>
                                  <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" title="Edit">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                </Link>
                                <button onClick={() => setDeleteJob(job)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" title="Delete">
                                  <Lock className="w-4 h-4" />
                                </button>
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
      </div>

      {/* View Drawer */}
      {viewJob && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={() => setViewJob(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${(STATUS_CONFIG[viewJob.status] || STATUS_CONFIG.Draft).bg} ${(STATUS_CONFIG[viewJob.status] || STATUS_CONFIG.Draft).text}`}>
                    {viewJob.status}
                  </span>
                  <h2 className="text-2xl font-bold text-white mt-2">{viewJob.title}</h2>
                  <p className="text-indigo-200 text-sm mt-1">{viewJob.department}</p>
                </div>
                <button onClick={() => setViewJob(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors cursor-pointer text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {[viewJob.employment_type, viewJob.work_mode, viewJob.experience, `${viewJob.openings} Opening${viewJob.openings > 1 ? "s" : ""}`].map((label) => (
                  <span key={label} className="text-xs font-medium bg-white/20 text-white px-3 py-1 rounded-full">{label}</span>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Department",      value: viewJob.department },
                  { label: "Employment Type", value: viewJob.employment_type },
                  { label: "Work Mode",       value: viewJob.work_mode },
                  { label: "Experience",      value: viewJob.experience },
                  { label: "Openings",        value: viewJob.openings },
                  { label: "Hiring Manager",  value: viewJob.hiring_manager },
                  { label: "Location",        value: viewJob.location },
                  { label: "Deadline",        value: new Date(viewJob.deadline).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{item.label}</p>
                    <p className="text-sm font-semibold text-gray-800">{item.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-indigo-500 rounded-full inline-block"></span>Job Summary
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4">{viewJob.summary}</p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-indigo-500 rounded-full inline-block"></span>Responsibilities
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4 whitespace-pre-line">{viewJob.responsibilities}</p>
              </div>

              {viewJob.required_skills?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-green-500 rounded-full inline-block"></span>Required Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {viewJob.required_skills.map((skill) => (
                      <span key={skill} className="text-xs font-medium bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              {viewJob.preferred_skills?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-purple-500 rounded-full inline-block"></span>Preferred Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {viewJob.preferred_skills.map((skill) => (
                      <span key={skill} className="text-xs font-medium bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              {(viewJob.salary_min || viewJob.salary_max) && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Salary Range</p>
                  <p className="text-sm font-semibold text-gray-800">{viewJob.salary_min} — {viewJob.salary_max}</p>
                </div>
              )}

              {viewJob.benefits && (
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <span className="w-1 h-4 bg-amber-500 rounded-full inline-block"></span>Benefits & Perks
                  </h3>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4 whitespace-pre-line">{viewJob.benefits}</p>
                </div>
              )}

              {viewJob.interview_process && (
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <span className="w-1 h-4 bg-blue-500 rounded-full inline-block"></span>Interview Process
                  </h3>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4 whitespace-pre-line">{viewJob.interview_process}</p>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Application Deadline</p>
                  <p className="text-sm font-bold text-amber-800 mt-0.5">
                    {new Date(viewJob.deadline).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
                <span className="text-2xl">📅</span>
              </div>
            </div>

            <div className="px-8 py-4 border-t border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
              <button onClick={() => setViewJob(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                Close
              </button>
              <Link href={`/Recruitment/job-description/${viewJob.id}`}>
                <button className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer">
                  <Pencil className="w-4 h-4" />Edit Job
                </button>
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Its a Close Modal - not permanantly delete form db */}
      {deleteJob && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" onClick={() => setDeleteJob(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mx-auto mb-5">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Close Job Description</h2>
              <p className="text-sm text-gray-500 text-center mb-1">You are about to close the Job Description</p>
              <p className="text-sm font-semibold text-gray-800 text-center mb-4">&quot;{deleteJob.title}&quot;</p>
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-6">
                <p className="text-xs text-red-600 text-center leading-relaxed">
                  This will mark the job as Closed and it will no longer be active.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDeleteJob(null)} disabled={deleting}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50">
                  <Lock className="w-4 h-4" />
                  {deleting ? "Closing..." : "Yes, Close"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      {/* view model for analysis */}
      {analysis && analysisJob && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
            onClick={() => {
              if (!savingAnalysis && !analyzingId) {
                setAnalysis(null);
                setAnalysisJob(null);
              }
            }}
          />

          <div className="fixed top-0 right-0 h-full w-full max-w-4xl bg-white z-50 shadow-2xl flex flex-col">

            {/* Header */}
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

            {/* Analysis Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6">

              {/* Temporary */}
              <pre className="bg-gray-50 rounded-xl p-5 text-sm text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(analysis, null, 2)}
              </pre>

            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">

              <button
                onClick={handleReAnalyze}
                disabled={
                  analyzingId === analysisJob.id ||
                  savingAnalysis
                }
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />

                {analyzingId === analysisJob.id
                  ? "Re-analyzing..."
                  : "Re-analyze"}
              </button>

              <button
                onClick={handleSaveAnalysis}
                disabled={
                  savingAnalysis ||
                  analyzingId === analysisJob.id
                }
                className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {savingAnalysis
                  ? "Saving..."
                  : "Save Analysis"}
              </button>

            </div>

          </div>
        </>
      )}
    </>
  );
} 
