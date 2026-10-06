"use client";

import { useEffect, useRef, useState } from "react";
import SideBar from "@/Components/SideBar";
import Link from "next/link";
import { AlertCircle, Eye, Loader2, RefreshCw, Search, Upload, X } from "lucide-react";
import { toast } from "react-toastify";

const TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const EXTS = [".pdf", ".doc", ".docx", ".txt"];
const MAX_SIZE = 5 * 1024 * 1024;

interface Job {
  id: number;
  title: string;
}

interface Resume {
  id: number;
  matchUrlId: string;
  name: string;
  email: string;
  fileName?: string;
  parsedAt?: string;
  matchingScore?: number | null;
  matchingStatus?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  matchingError?: string | null;
  matchingCriteria?: {
    skills: number | null;
    experience: number | null;
    noticePeriod: number | null;
    salary: number | null;
  };
  applicationStatus?: string;
  interviewScheduled?: boolean;
  interviewDate?: string;
  interviewTimeFrom?: string;
  interviewTimeTo?: string;
  jobDescriptionId?: number;
  mobileNumber?: string;
  alternatePhone?: string;
  currentAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  linkedin?: string;
  portfolio?: string;
  github?: string;
  careerObjective?: string;
  summary?: string;
  workExperience?: unknown;
  education?: Array<{
    degree?: string;
    specialization?: string;
    institutionName?: string;
    university?: string;
    graduationYear?: string;
    percentage?: string;
    cgpa?: string;
  }>;
  technicalSkills?: unknown;
  softSkills?: unknown;
  certifications?: unknown;
  languages?: unknown;
  projects?: unknown;
  awards?: unknown;
  publications?: unknown;
  training?: unknown;
  noticePeriod?: string;
  currentSalary?: string;
  expectedSalary?: string;
  preferredLocation?: string;
  aiModel?: string;
  parsingStatus?: string;
}

interface Data {
  resumes: Resume[];
  jobs: Job[];
}

export default function JobApplicationsClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const matchingRequests = useRef(new Set<number>());
  const [data, setData] = useState<Data>({ resumes: [], jobs: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [jobId, setJobId] = useState("all");
  const [sortBy, setSortBy] = useState("score");
  const [uploadJobId, setUploadJobId] = useState("");
  const [matches, setMatches] = useState<Map<number, unknown> | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [parsing, setParsing] = useState(false);
  const [retryingResumeId, setRetryingResumeId] = useState<number | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleResume, setScheduleResume] = useState<Resume | null>(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTimeFrom, setInterviewTimeFrom] = useState("");
  const [interviewTimeTo, setInterviewTimeTo] = useState("");
  const [scheduling, setScheduling] = useState(false);

  const loadResumes = async () => {
    try {
      const response = await fetch("/api/recruitment/job-application/dashboard");
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not load parsed resumes");
      setData(result);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (resumeId: number, status: string) => {
    try {
      const response = await fetch("/api/recruitment/job-application/application-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to update application status");
      setData((prev) => ({
        ...prev,
        resumes: prev.resumes.map((r) => r.id === resumeId ? { ...r, applicationStatus: status } : r),
      }));
    } catch (error) {
      toast.error((error as Error).message || "Failed to update application status");
    }
  };

  const shortlistCandidate = async (resume: Resume) => {
    try {
      const response = await fetch("/api/recruitment/job-application/shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: resume.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to shortlist candidate");
      setData((prev) => ({
        ...prev,
        resumes: prev.resumes.map((r) => r.id === resume.id ? { ...r, applicationStatus: "Shortlisted" } : r),
      }));
      toast.success("Resume shortlisted");
    } catch (error) {
      toast.error((error as Error).message || "Failed to shortlist candidate");
    }
  };

  const handleScheduleInterview = (resume: Resume) => {
    setScheduleResume(resume);
    setInterviewDate("");
    setInterviewTimeFrom("");
    setInterviewTimeTo("");
    setScheduleOpen(true);
  };

  const closeSchedule = () => {
    setScheduleOpen(false);
    setScheduleResume(null);
    setInterviewDate("");
    setInterviewTimeFrom("");
    setInterviewTimeTo("");
  };

  const scheduleInterview = async () => {
    if (!scheduleResume || !interviewDate || !interviewTimeFrom || !interviewTimeTo) {
      toast.error("Please fill all interview details");
      return;
    }
    try {
      setScheduling(true);
      const response = await fetch("/api/recruitment/job-application/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: scheduleResume.id, interviewDate, interviewTimeFrom, interviewTimeTo }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to schedule interview");
      setData((prev) => ({
        ...prev,
        resumes: prev.resumes.map((r) =>
          r.id === scheduleResume.id
            ? { ...r, interviewScheduled: true, interviewDate, interviewTimeFrom, interviewTimeTo }
            : r
        ),
      }));
      toast.success("Interview scheduled successfully");
      closeSchedule();
    } catch (error) {
      toast.error((error as Error).message || "Failed to schedule interview");
    } finally {
      setScheduling(false);
    }
  };

  useEffect(() => {
    loadResumes();
    const interval = setInterval(loadResumes, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    for (const resume of data.resumes) {
      if (resume.matchingStatus !== "PENDING" || matchingRequests.current.has(resume.id)) {
        continue;
      }

      matchingRequests.current.add(resume.id);
      void fetch(`/api/recruitment/job-application/${resume.id}/match`, {
        method: "POST",
      })
        .then(async (response) => {
          const result = await response.json();
          if (!response.ok && result.status !== "FAILED") {
            throw new Error(result.error || "Unable to start candidate matching");
          }
        })
        .catch((error: unknown) => {
          toast.error(error instanceof Error ? error.message : "Unable to start candidate matching");
        })
        .finally(() => {
          matchingRequests.current.delete(resume.id);
          void loadResumes();
        });
    }
  }, [data.resumes]);

  const retryMatching = async (resumeId: number) => {
    matchingRequests.current.add(resumeId);
    setRetryingResumeId(resumeId);
    setData((current) => ({
      ...current,
      resumes: current.resumes.map((resume) =>
        resume.id === resumeId
          ? { ...resume, matchingStatus: "PROCESSING", matchingError: null }
          : resume
      ),
    }));
    try {
      const response = await fetch(`/api/recruitment/job-application/${resumeId}/match`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to retry candidate matching");
      await loadResumes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to retry candidate matching");
    } finally {
      matchingRequests.current.delete(resumeId);
      setRetryingResumeId(null);
    }
  };

  useEffect(() => {
    if (jobId === "all") { setMatches(null); return; }
    fetch(`/api/recruitment/job-description/${jobId}/matches`)
      .then((r) => r.json())
      .then((result) => {
        if (!result.success) throw new Error(result.error || "Could not load matches");
        setMatches(new Map(result.results.map((item: { profileId: number }) => [item.profileId, item])));
      })
      .catch((error) => { setMatches(new Map()); toast.error(error.message); });
  }, [jobId]);

  const chooseFile = (selectedFile: File | null | undefined) => {
    setFileError("");
    setFile(null);
    if (!selectedFile) return;
    const extension = "." + selectedFile.name.split(".").pop()!.toLowerCase();
    if (!TYPES.includes(selectedFile.type) && !EXTS.includes(extension)) {
      setFileError("Only PDF, DOC, DOCX or TXT files are allowed.");
      return;
    }
    if (selectedFile.size > MAX_SIZE) { setFileError("File size must be less than 5 MB."); return; }
    setFile(selectedFile);
  };

  const parseResume = async () => {
    if (!file || !uploadJobId) return;
    setParsing(true);
    const body = new FormData();
    body.append("resume", file);
    body.append("job_description_id", uploadJobId);
    try {
      const response = await fetch("/api/recruitment/job-application/parse-resume", { method: "POST", body });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Resume parsing failed");
      toast.success("Resume parsed successfully");
      setUploadOpen(false);
      setFile(null);
      await loadResumes();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setParsing(false);
    }
  };

  const closeUpload = () => {
    setUploadOpen(false);
    setFile(null);
    setFileError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const matchesSearch = (resume: Resume, searchText: string) => {
    const query = searchText.trim().toLowerCase();
    if (!query) return true;
    return Object.values(resume).some((value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === "object") return JSON.stringify(value).toLowerCase().includes(query);
      return String(value).toLowerCase().includes(query);
    });
  };

  const filtered = data.resumes.filter((resume) => {
    const searchMatch = matchesSearch(resume, search);
    const jobMatch = jobId === "all" || String(resume.jobDescriptionId) === String(jobId);
    return searchMatch && jobMatch;
  });

  const ranked = [...filtered].sort((a, b) => {
    const value = (resume: Resume): number | null => {
      if (sortBy === "date") {
        const timestamp = resume.parsedAt ? Date.parse(resume.parsedAt) : NaN;
        return Number.isNaN(timestamp) ? null : timestamp;
      }
      if (sortBy === "experience") return resume.matchingCriteria?.experience ?? null;
      if (sortBy === "skills") return resume.matchingCriteria?.skills ?? null;
      if (sortBy === "notice") return resume.matchingCriteria?.noticePeriod ?? null;
      if (sortBy === "salary") return resume.matchingCriteria?.salary ?? null;
      return resume.matchingScore ?? null;
    };
    const first = value(a);
    const second = value(b);
    if (first === null) return second === null ? 0 : 1;
    if (second === null) return -1;
    return second - first;
  });

  const parsedCount = data.resumes.length;

  return (
    <>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <main className="flex-1 overflow-auto p-6 lg:p-10">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-2">Recruitment workspace</p>
              <h1 className="text-3xl font-bold text-gray-900">Parsed Resumes</h1>
              <p className="text-gray-500 mt-1">Review resumes extracted and analyzed by the system.</p>
            </div>
            <button
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              <Upload className="w-4 h-4" />
              Upload resume
            </button>
          </header>

          <section className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <p className="text-2xl font-bold text-gray-900">{parsedCount}</p>
              <p className="text-sm text-gray-500 mt-1">Parsed resumes</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <p className="text-2xl font-bold text-green-600">{data.jobs.length}</p>
              <p className="text-sm text-gray-500 mt-1">Active job descriptions</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <p className="text-2xl font-bold text-indigo-600">{matches ? filtered.length : "-"}</p>
              <p className="text-sm text-gray-500 mt-1">Eligible for selected job</p>
            </div>
          </section>

          <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search parsed resumes"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <select
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600"
              >
                <option value="all">All job descriptions</option>
                {data.jobs.map((job) => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>
              <select
                aria-label="Sort candidates by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600"
              >
                <option value="score">Sort: Match score</option>
                <option value="experience">Sort: Experience match</option>
                <option value="skills">Sort: Skills match</option>
                <option value="notice">Sort: Notice period match</option>
                <option value="salary">Sort: Salary match</option>
                <option value="date">Sort: Application date</option>
              </select>
            </div>

            {jobId !== "all" && (
              <p className="px-5 py-3 text-xs text-indigo-600 border-b border-indigo-100 bg-indigo-50">
                Candidates are ranked by match score, highest first.
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {["Rank", "Name", "Email", "Resume file", "Parsed on", "Matching Score", "Action"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={7} className="p-12 text-center text-sm text-gray-400">Loading parsed resumes...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className="p-12 text-center text-sm text-gray-400">No parsed resumes match the current filters.</td></tr>
                  ) : (
                    ranked.map((resume, index) => (
                      <tr key={resume.id} className="hover:bg-gray-50">
                        <td className="px-5 py-4 text-sm font-bold text-gray-400">{index + 1}</td>
                        <td className="px-5 py-4 font-semibold text-gray-900">{resume.name}</td>
                        <td className="px-5 py-4 text-sm text-gray-600">{resume.email}</td>
                        <td className="px-5 py-4 text-sm text-gray-600">{resume.fileName || "-"}</td>
                        <td className="px-5 py-4 text-sm text-gray-500">
                          {resume.parsedAt ? new Date(resume.parsedAt).toLocaleDateString("en-IN") : "-"}
                        </td>
                        <td className="px-5 py-4">
                          {!resume.jobDescriptionId ? (
                            <span className="text-xs text-gray-400">No linked job</span>
                          ) : resume.matchingStatus === "COMPLETED" && resume.matchingScore !== null && resume.matchingScore !== undefined ? (
                            <div>
                              <span className="text-sm font-bold text-indigo-600">{resume.matchingScore}%</span>
                              <p className="mt-1 text-xs text-gray-500">Final match score</p>
                            </div>
                          ) : resume.matchingStatus === "FAILED" ? (
                            <div className="flex flex-col items-start gap-1">
                              <span className="max-w-56 text-xs text-red-600" title={resume.matchingError || undefined}>
                                {resume.matchingError || "Comparison failed"}
                              </span>
                              <button
                                onClick={() => retryMatching(resume.id)}
                                disabled={retryingResumeId === resume.id}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:text-gray-400"
                              >
                                <RefreshCw className={`h-3 w-3 ${retryingResumeId === resume.id ? "animate-spin" : ""}`} />
                                {retryingResumeId === resume.id ? "Retrying..." : "Retry"}
                              </button>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-2 text-xs text-gray-500" title={resume.matchingStatus === "PROCESSING" ? "Matching is running in the background" : "Waiting for matching to start"}>
                              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                              {resume.matchingStatus === "PROCESSING" ? "Comparing..." : "Queued..."}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {resume.jobDescriptionId && resume.matchingStatus === "COMPLETED" ? (
                              <Link
                                title="View candidate and job comparison"
                                aria-label={`View match details for ${resume.name}`}
                                href={`/Recruitment/job-applications/${resume.matchUrlId}/match`}
                                className="inline-flex items-center gap-1 px-2 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                              >
                                <Eye className="w-4 h-4" />
                                <span className="text-xs font-semibold">View</span>
                              </Link>
                            ) : resume.jobDescriptionId ? (
                              <span className="px-2 py-2 text-xs text-gray-400">Available when comparison is done</span>
                            ) : (
                              <span className="px-2 py-2 text-xs text-gray-400">No linked job</span>
                            )}
                            {resume.applicationStatus === "Shortlisted" ? (
                              <>
                                <span className="px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 rounded-lg">Shortlisted</span>
                                {resume.interviewScheduled ? (
                                  <span className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg">Interview Scheduled</span>
                                ) : (
                                  <button onClick={() => handleScheduleInterview(resume)} className="cursor-pointer px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg">
                                    Schedule Interview
                                  </button>
                                )}
                              </>
                            ) : resume.applicationStatus === "Rejected" ? (
                              <span className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded-lg">Rejected</span>
                            ) : (
                              <>
                                <button onClick={() => shortlistCandidate(resume)} className="cursor-pointer px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg">Shortlist</button>
                                <button onClick={() => updateApplicationStatus(resume.id, "Rejected")} className="cursor-pointer px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg">Reject</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {uploadOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center p-4 pt-20">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-start mb-5">
              <h2 className="text-xl font-bold text-gray-900">Upload resume</h2>
              <button onClick={closeUpload}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Job Description</label>
              <select
                value={uploadJobId}
                onChange={(e) => setUploadJobId(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Select job description</option>
                {data.jobs.map((job) => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>
            </div>
            <div
              onClick={() => !file && inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); chooseFile(e.dataTransfer.files[0]); }}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400"
            >
              {file ? (
                <p className="font-medium text-gray-800">{file.name}</p>
              ) : (
                <>
                  <Upload className="w-9 h-9 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">Choose or drop a resume</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX or TXT up to 5 MB</p>
                </>
              )}
            </div>
            <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => chooseFile(e.target.files?.[0])} />
            {fileError && (
              <p className="mt-3 text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />{fileError}
              </p>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeUpload} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Cancel</button>
              <button onClick={parseResume} disabled={!file || !uploadJobId || !!fileError || parsing} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg disabled:bg-gray-300">
                {parsing ? <><Loader2 className="w-4 h-4 inline mr-1 animate-spin" />Parsing...</> : "Parse resume"}
              </button>
            </div>
          </div>
        </div>
      )}

      {scheduleOpen && scheduleResume && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Interview</p>
                <h2 className="text-xl font-bold text-gray-900 mt-1">Schedule Interview</h2>
                <p className="text-sm text-gray-600 mt-2">{scheduleResume.name}</p>
                <p className="text-xs text-gray-400">{scheduleResume.email}</p>
              </div>
              <button onClick={closeSchedule} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Job Description</label>
                <input
                  type="text"
                  value={data.jobs.find((j) => String(j.id) === String(scheduleResume.jobDescriptionId))?.title || "-"}
                  disabled
                  className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Interview Date</label>
                <input type="date" value={interviewDate} min={new Date().toISOString().split("T")[0]} onChange={(e) => setInterviewDate(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Interview From</label>
                <input type="time" value={interviewTimeFrom} onChange={(e) => setInterviewTimeFrom(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Interview To</label>
                <input type="time" value={interviewTimeTo} onChange={(e) => setInterviewTimeTo(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeSchedule} disabled={scheduling} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={scheduleInterview} disabled={scheduling || !interviewDate || !interviewTimeFrom || !interviewTimeTo} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300">
                {scheduling ? "Scheduling..." : "Schedule Interview"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
