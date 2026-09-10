import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import SideBar from "@/Components/SideBar";
import { AlertCircle, Eye, FileText, Loader2, Search, Upload, X, Download } from "lucide-react";
import { toast } from "react-toastify";

const TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
const EXTS = [".pdf", ".doc", ".docx", ".txt"];
const MAX_SIZE = 5 * 1024 * 1024;
const readable = (value) => Array.isArray(value) ? value.map((item) => typeof item === "object" ? Object.values(item).filter(Boolean).join(" - ") : item).join(", ") : value || "Not available";

export default function JobApplications() {
  const inputRef = useRef(null);
  const [data, setData] = useState({ resumes: [], jobs: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [jobId, setJobId] = useState("all");
  const [uploadJobId, setUploadJobId] = useState("");
  const [matches, setMatches] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [parsing, setParsing] = useState(false);
  const [viewResume, setViewResume] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleResume, setScheduleResume] = useState(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTimeFrom, setInterviewTimeFrom] = useState("");
  const [interviewTimeTo, setInterviewTimeTo] = useState("");
  const [scheduling, setScheduling] = useState(false);

  const loadResumes = async () => {
    try {
      const response = await fetch("/api/recruitment/job-applications/dashboard"); // Fetch all parsed resumes and job descriptions
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not load parsed resumes");
      setData(result);
    } catch (error) { toast.error(error.message); } finally { setLoading(false); }
  };

  const updateApplicationStatus = async (resumeId, status) => {
  try {
    const response = await fetch("/api/recruitment/job-applications/application-status", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resumeId,
        status,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to update application status");
    }

    // Update UI immediately
    setData((prev) => ({
      ...prev,
      resumes: prev.resumes.map((resume) =>
        resume.id === resumeId
          ? {
              ...resume,
              applicationStatus: status,
            }
          : resume
      ),
    }));
  } catch (error) {
    console.error("Application status update error:", error);
    alert(error.message || "Failed to update application status");
  }
};

const shortlistCandidate = async (resume) => {
  try {
    const response = await fetch(
      "/api/recruitment/job-applications/shortlist",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeId: resume.id,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error || "Failed to shortlist candidate"
      );
    }

    setData((prev) => ({
      ...prev,
      resumes: prev.resumes.map((item) =>
        item.id === resume.id
          ? {
              ...item,
              applicationStatus: "Shortlisted",
            }
          : item
      ),
    }));

    toast.success("Resume shortlisted");
  } catch (error) {
    console.error("Shortlist error:", error);
    toast.error(error.message || "Failed to shortlist candidate");
  }
};

const handleScheduleInterview = (resume) => {
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
  if (
    !scheduleResume ||
    !interviewDate ||
    !interviewTimeFrom ||
    !interviewTimeTo
  ) {
    toast.error("Please fill all interview details");
    return;
  }

  try {
    setScheduling(true);

    const response = await fetch(
      "/api/recruitment/job-applications/schedule",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeId: scheduleResume.id,
          interviewDate,
          interviewTimeFrom,
          interviewTimeTo,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error || "Failed to schedule interview"
      );
    }

    // Update the resume in frontend
    setData((prev) => ({
      ...prev,
      resumes: prev.resumes.map((resume) =>
        resume.id === scheduleResume.id
          ? {
              ...resume,
              interviewScheduled: true,
              interviewDate,
              interviewTimeFrom,
              interviewTimeTo,
            }
          : resume
      ),
    }));

    toast.success("Interview scheduled successfully");

    closeSchedule();
  } catch (error) {
    console.error("Schedule interview error:", error);
    toast.error(
      error.message || "Failed to schedule interview"
    );
  } finally {
    setScheduling(false);
  }
};

  useEffect(() => {
    loadResumes();

    const interval = setInterval(() => {
      loadResumes();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
  if (jobId === "all") {
    setMatches(null);
    return;
  }

  fetch(`/api/recruitment/job-description/${jobId}/matches`)
    .then((response) => response.json())
    .then((result) => {
      if (!result.success) {
        throw new Error(result.error || "Could not load matches");
      }

      setMatches(
        new Map(
          result.results.map((item) => [item.profileId, item])
        )
      );
    })
    .catch((error) => {
      setMatches(new Map());
      toast.error(error.message);
    });
}, [jobId]);
const chooseFile = (selectedFile) => {
  setFileError("");
  setFile(null);

  if (!selectedFile) return;

  const extension = "." + selectedFile.name.split(".").pop().toLowerCase();

  if (!TYPES.includes(selectedFile.type) && !EXTS.includes(extension)) {
    setFileError("Only PDF, DOC, DOCX or TXT files are allowed.");
    return;
  }

  if (selectedFile.size > MAX_SIZE) {
    setFileError("File size must be less than 5 MB.");
    return;
  }

  setFile(selectedFile);
};
  const parseResume = async () => {
  if (!file || !uploadJobId) return;
    setParsing(true);
    const body = new FormData();
    body.append("resume", file);
    body.append("job_description_id", uploadJobId);
    
    try {
      const response = await fetch("/api/recruitment/job-applications/parse-resume", { method: "POST", body });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Resume parsing failed");
      toast.success("Resume parsed successfully");
      setUploadOpen(false); setFile(null); await loadResumes();
    } catch (error) { toast.error(error.message); } finally { setParsing(false); }
  };

  const closeUpload = () => { setUploadOpen(false); setFile(null); setFileError(""); if (inputRef.current) inputRef.current.value = ""; };
  
  const matchesSearch = (resume, searchText) => {
  const query = searchText.trim().toLowerCase();

  if (!query) return true;

  return Object.values(resume).some((value) => {
    if (value === null || value === undefined) {
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

const filtered = data.resumes.filter((resume) => {
  const searchMatch = matchesSearch(resume, search);

  const jobMatch =
    jobId === "all" ||
    String(resume.jobDescriptionId) === String(jobId);

  return searchMatch && jobMatch;
});

  const parsedCount = data.resumes.length;

  const downloadResume = (resumeId) => {
    window.open(
      `/api/recruitment/job-applications/download-resume?resumeId=${resumeId}`,
      "_blank"
    );
  };
  
  return <>
    <Head><title>Parsed Resumes - HRMS</title></Head>

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
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search parsed resumes"
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <select
              value={jobId}
              onChange={(event) => setJobId(event.target.value)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600"
            >
              <option value="all">All job descriptions</option>
              {data.jobs.map((job) => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
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
                  {["Rank", "Name", "Email", "Resume file", "Parsed on", "Matching Score", "Action"].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-sm text-gray-400">
                      Loading parsed resumes...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-sm text-gray-400">
                      No parsed resumes match the current filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((resume, index) => (
                    <tr key={resume.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 text-sm font-bold text-gray-400">
                        {index + 1}
                      </td>

                      <td className="px-5 py-4 font-semibold text-gray-900">
                        {resume.name}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {resume.email}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {resume.fileName || "-"}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-500">
                        {resume.parsedAt ? new Date(resume.parsedAt).toLocaleDateString("en-IN") : "-"}
                      </td>

                      <td className="px-5 py-4">
                        {resume.matchingScore !== null && resume.matchingScore !== undefined ? (
                          <span className="text-sm font-bold text-indigo-600">
                            {resume.matchingScore}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-xs text-gray-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Calculating...
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">

                          {/* View */}
                          <button
                            title="View parsed resume"
                            onClick={() => setViewResume(resume)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Application Status / Interview Action */}

                          {resume.applicationStatus === "Shortlisted" ? (
                            <>
                              <span className="px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 rounded-lg">
                                Shortlisted
                              </span>

                              {resume.interviewScheduled ? (
                                <span className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg">
                                  Interview Scheduled
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleScheduleInterview(resume)}
                                  className="cursor-pointer px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
                                >
                                  Schedule Interview
                                </button>
                              )}
                            </>
                          ) : resume.applicationStatus === "Rejected" ? (
                            <span className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded-lg">
                              Rejected
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => shortlistCandidate(resume)}
                                className="cursor-pointer px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg"
                              >
                                Shortlist
                              </button>

                              <button
                                onClick={() =>
                                  updateApplicationStatus(resume.id, "Rejected")
                                }
                                className="cursor-pointer px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg"
                              >
                                Reject
                              </button>
                            </>
                            
                          )}
                          {/* <button
                            title="Download resume"
                            onClick={() => downloadResume(resume.id)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                          </button> */}

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
            <div>
              <h2 className="text-xl font-bold text-gray-900">Upload resume</h2>
              {/* <p className="text-sm text-gray-500 mt-1">
                The parsed record will be stored in parsed_resumes.
              </p> */}
            </div>

            <button onClick={closeUpload}>
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Job Description
            </label>

            <select
              value={uploadJobId}
              onChange={(event) => setUploadJobId(event.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">Select job description</option>

              {data.jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>

          <div
            onClick={() => !file && inputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              chooseFile(event.dataTransfer.files[0]);
            }}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400"
          >
            {file ? (
              <p className="font-medium text-gray-800">{file.name}</p>
            ) : (
              <>
                <Upload className="w-9 h-9 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">
                  Choose or drop a resume
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PDF, DOC, DOCX or TXT up to 5 MB
                </p>
              </>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={(event) => chooseFile(event.target.files[0])}
          />

          {fileError && (
            <p className="mt-3 text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {fileError}
            </p>
          )}

          <div className="flex justify-end gap-3 mt-6">

            <button
              onClick={closeUpload}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg"
            >
              Cancel
            </button>

            <button
              onClick={parseResume}
              disabled={!file || !uploadJobId || !!fileError || parsing}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg disabled:bg-gray-300"
            >
              {parsing ? (
                <>
                  <Loader2 className="w-4 h-4 inline mr-1 animate-spin" />
                  Parsing...
                </>
              ) : (
                "Parse resume"
              )}
            </button>

          </div>

        </div>
      </div>
    )}

    {viewResume && (
      <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">

          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                Parsed resume
              </p>
              <h2 className="text-2xl font-bold text-gray-900 mt-1">
                {viewResume.name}
              </h2>
              <p className="text-sm text-gray-500">
                {viewResume.email}
              </p>
            </div>

            <button onClick={() => setViewResume(null)}>
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="space-y-6">

            <section>
              <h3 className="text-sm font-bold text-gray-800 mb-2">
                Personal information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                <p><b>Mobile:</b> {viewResume.mobileNumber || "-"}</p>
                <p><b>Alternate phone:</b> {viewResume.alternatePhone || "-"}</p>
                <p><b>Address:</b> {viewResume.currentAddress || "-"}</p>
                <p><b>City / State / Country:</b> {[viewResume.city, viewResume.state, viewResume.country].filter(Boolean).join(" / ") || "-"}</p>
                <p><b>LinkedIn:</b> {viewResume.linkedin || "-"}</p>
                <p><b>Portfolio:</b> {viewResume.portfolio || "-"}</p>
                <p><b>GitHub:</b> {viewResume.github || "-"}</p>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-gray-800 mb-2">
                Professional information
              </h3>

              <p className="text-sm text-gray-600">
                <b>Career objective:</b> {viewResume.careerObjective || "-"}
              </p>

              <p className="text-sm text-gray-600 mt-2">
                <b>Summary:</b> {viewResume.summary || "-"}
              </p>
            </section>

            <section>
              <h3 className="text-sm font-bold text-gray-800 mb-2">
                Work experience
              </h3>

              <p className="text-sm text-gray-600">
                {readable(viewResume.workExperience)}
              </p>
            </section>

            <section>
              <h3 className="text-sm font-bold text-gray-800 mb-2">
                Education
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Degree", "Specialization", "Institution", "University", "Year", "Percentage", "CGPA"].map((heading) => (
                        <th key={heading} className="px-3 py-2 text-left text-xs text-gray-500">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {(Array.isArray(viewResume.education) ? viewResume.education : []).map((education, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2">{education.degree || "-"}</td>
                        <td className="px-3 py-2">{education.specialization || "-"}</td>
                        <td className="px-3 py-2">{education.institutionName || "-"}</td>
                        <td className="px-3 py-2">{education.university || "-"}</td>
                        <td className="px-3 py-2">{education.graduationYear || "-"}</td>
                        <td className="px-3 py-2">{education.percentage || "-"}</td>
                        <td className="px-3 py-2">{education.cgpa || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-gray-800 mb-2">
                Skills and qualifications
              </h3>

              <p className="text-sm text-gray-600">
                <b>Technical:</b> {readable(viewResume.technicalSkills)}
              </p>

              <p className="text-sm text-gray-600">
                <b>Soft:</b> {readable(viewResume.softSkills)}
              </p>

              <p className="text-sm text-gray-600">
                <b>Certifications:</b> {readable(viewResume.certifications)}
              </p>

              <p className="text-sm text-gray-600">
                <b>Languages:</b> {readable(viewResume.languages)}
              </p>
            </section>

            <section>
              <h3 className="text-sm font-bold text-gray-800 mb-2">
                Additional information
              </h3>

              <p className="text-sm text-gray-600">
                <b>Projects:</b> {readable(viewResume.projects)}
              </p>

              <p className="text-sm text-gray-600">
                <b>Awards:</b> {readable(viewResume.awards)}
              </p>

              <p className="text-sm text-gray-600">
                <b>Publications:</b> {readable(viewResume.publications)}
              </p>

              <p className="text-sm text-gray-600">
                <b>Training:</b> {readable(viewResume.training)}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mt-2">
                <p><b>Notice period:</b> {viewResume.noticePeriod || "-"}</p>
                <p><b>Current salary:</b> {viewResume.currentSalary || "-"}</p>
                <p><b>Expected salary:</b> {viewResume.expectedSalary || "-"}</p>
                <p><b>Preferred location:</b> {viewResume.preferredLocation || "-"}</p>
              </div>
            </section>

            <section className="text-xs text-gray-400">
              <p>File: {viewResume.fileName || "-"}</p>
              <p>Parser: {viewResume.aiModel || "-"} | Status: {viewResume.parsingStatus || "-"}</p>
            </section>

          </div>
        </div>
      </div>
    )}
    {scheduleOpen && scheduleResume && (
  <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
            Interview
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-1">
            Schedule Interview
          </h2>

          <p className="text-sm text-gray-600 mt-2">
            {scheduleResume.name}
          </p>

          <p className="text-xs text-gray-400">
            {scheduleResume.email}
          </p>
        </div>

        <button
          onClick={closeSchedule}
          className="p-1 hover:bg-gray-100 rounded-lg"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="space-y-4">

        {/* Job Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Job Description
          </label>

          <input
            type="text"
            value={
              data.jobs.find(
                (job) =>
                  String(job.id) ===
                  String(scheduleResume.jobDescriptionId)
              )?.title || "-"
            }
            disabled
            className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-600"
          />
        </div>

        {/* Interview Date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Interview Date
          </label>

          <input
            type="date"
            value={interviewDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(event) =>
              setInterviewDate(event.target.value)
            }
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        {/* From */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Interview From
          </label>

          <input
            type="time"
            value={interviewTimeFrom}
            onChange={(event) =>
              setInterviewTimeFrom(event.target.value)
            }
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        {/* To */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Interview To
          </label>

          <input
            type="time"
            value={interviewTimeTo}
            onChange={(event) =>
              setInterviewTimeTo(event.target.value)
            }
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

      </div>

      <div className="flex justify-end gap-3 mt-6">

        <button
          onClick={closeSchedule}
          disabled={scheduling}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>

        <button
          onClick={scheduleInterview}
          disabled={
            scheduling ||
            !interviewDate ||
            !interviewTimeFrom ||
            !interviewTimeTo
          }
          className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300"
        >
          {scheduling ? "Scheduling..." : "Schedule Interview"}
        </button>

      </div>

    </div>
  </div>
)}
  </>;
}
