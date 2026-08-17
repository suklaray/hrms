import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import SideBar from "@/Components/SideBar";
import { ChevronDown, X, Clock, AlertCircle } from "lucide-react";
import MultiSelect from "@/Components/MultiSelect";

function Label({ children, required }) {
  return <label className="block text-sm font-semibold text-gray-700 mb-1.5">{children}{required && <span className="text-red-500 ml-0.5">*</span>}</label>;
}
function Input({ ...props }) {
  return <input {...props} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent placeholder-gray-400 text-gray-800" />;
}
function Select({ children, ...props }) {
  return (
    <div className="relative">
      <select {...props} className="w-full appearance-none px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent text-gray-700 cursor-pointer pr-9">{children}</select>
      <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
}
function Textarea({ rows = 4, ...props }) {
  return <textarea rows={rows} {...props} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent placeholder-gray-400 text-gray-800 resize-none" />;
}
function SectionCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
      <div className="mb-5 pb-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-800">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default function EditJobDescription() {
  const router = useRouter();
  const { id } = router.query;

  const [form, setForm]       = useState(null);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
  if (!id || !/^\d+$/.test(id)) return;
  fetch(`/api/recruitment/job-description/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          ...data,
          deadline: data.deadline ? new Date(data.deadline).toISOString().split("T")[0] : "",
        });
        setFetching(false);
      })
      .catch(() => { setError("Failed to load job description."); setFetching(false); });
  }, [id]);

  const set = (field) => (e) => { setForm((f) => ({ ...f, [field]: e.target.value })); setSaved(false); };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError(""); setSaved(false); setLoading(true);
    try {
      const res = await fetch(`/api/recruitment/job-description/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      setSaved(true);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <div className="flex min-h-screen bg-gray-50">
      <SideBar />
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );

  if (!form) return (
    <div className="flex min-h-screen bg-gray-50">
      <SideBar />
      <div className="flex-1 flex items-center justify-center">
        <p className="text-red-500 text-sm">{error || "Job not found."}</p>
      </div>
    </div>
  );

  return (
    <>
      <Head><title>Edit Job Description - HRMS</title></Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 flex flex-col overflow-hidden">

          <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
            <div>
              <nav className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                <Link href="/Recruitment/recruitment" className="hover:text-indigo-600 transition-colors">Recruitment</Link>
                <span>/</span>
                <Link href="/Recruitment/job-description" className="hover:text-indigo-600 transition-colors">Job Descriptions</Link>
                <span>/</span>
                <span className="text-gray-600 font-medium">Edit Job</span>
              </nav>
              <h1 className="text-xl font-bold text-gray-900">Edit Job Description</h1>
              <p className="text-sm text-gray-400 mt-0.5">Update and manage this job description.</p>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-8">

            {/* Info Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">You are editing a live job description</p>
                  <p className="text-xs text-amber-600 mt-0.5">Changes will reflect immediately if status is Published.</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-amber-600">
                <Clock className="w-3.5 h-3.5" />
                Last updated: {new Date(form.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-5 py-3 mb-5">{error}</div>
            )}

            {/* Success Banner */}
            {saved && (
              <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 mb-6 flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-green-800">Job description updated successfully.</p>
              </div>
            )}

            <form onSubmit={handleUpdate}>
              <SectionCard title="Basic Information" subtitle="General details about the job position">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <Label required>Job Title</Label>
                    <Input placeholder="e.g. Senior Frontend Developer" value={form.title} onChange={set("title")} />
                  </div>
                  <div>
                    <Label required>Department</Label>
                    <Input placeholder="e.g. Engineering" value={form.department} onChange={set("department")} />
                  </div>
                  <div>
                    <Label required>Employment Type</Label>
                    <Select value={form.employment_type} onChange={set("employment_type")}>
                      <option value="">Select employment type</option>
                      <option>Full-time</option><option>Part-time</option>
                      <option>Contract</option><option>Internship</option>
                    </Select>
                  </div>
                  <div>
                    <Label required>Work Mode</Label>
                    <Select value={form.work_mode} onChange={set("work_mode")}>
                      <option value="">Select work mode</option>
                      <option>On-site</option><option>Remote</option><option>Hybrid</option>
                    </Select>
                  </div>
                  <div>
                    <Label required>Job Location</Label>
                    <Input placeholder="e.g. Bangalore, India" value={form.location} onChange={set("location")} />
                  </div>
                  <div>
                    <Label required>Number of Openings</Label>
                    <Input type="number" min="1" placeholder="e.g. 2" value={form.openings} onChange={set("openings")} />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Requirements" subtitle="Skills, qualifications and experience needed">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label required>Experience Required</Label>
                    <Input placeholder="e.g. 3-5 Years" value={form.experience} onChange={set("experience")} />
                  </div>
                  <div>
                    <Label required>Educational Qualification</Label>
                    <Input placeholder="e.g. B.Tech / B.E. in Computer Science" value={form.education} onChange={set("education")} />
                  </div>
                  <div className="md:col-span-2">
                    <Label required>Required Skills</Label>
                    <MultiSelect selected={form.required_skills || []}
                      onChange={(v) => { setForm((f) => ({ ...f, required_skills: v })); setSaved(false); }}
                      placeholder="Search and select required skills..." />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Preferred Skills</Label>
                    <MultiSelect selected={form.preferred_skills || []}
                      onChange={(v) => { setForm((f) => ({ ...f, preferred_skills: v })); setSaved(false); }}
                      placeholder="Search and select preferred skills..." />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Job Details" subtitle="Describe the role responsibilities and summary">
                <div className="space-y-5">
                  <div>
                    <Label required>Job Responsibilities</Label>
                    <Textarea rows={5} placeholder="List the key responsibilities for this role..." value={form.responsibilities} onChange={set("responsibilities")} />
                  </div>
                  <div>
                    <Label required>Job Summary</Label>
                    <Textarea rows={4} placeholder="Write a brief summary about this job position..." value={form.summary} onChange={set("summary")} />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Compensation" subtitle="Salary and benefits information (optional)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label>Salary Range (Min)</Label>
                    <Input placeholder="e.g. ₹8,00,000" value={form.salary_min || ""} onChange={set("salary_min")} />
                  </div>
                  <div>
                    <Label>Salary Range (Max)</Label>
                    <Input placeholder="e.g. ₹14,00,000" value={form.salary_max || ""} onChange={set("salary_max")} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Benefits & Perks</Label>
                    <Textarea rows={3} placeholder="e.g. Health insurance, flexible hours..." value={form.benefits || ""} onChange={set("benefits")} />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Hiring Information" subtitle="Deadline, process and job status">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label required>Application Deadline</Label>
                    <Input type="date" value={form.deadline} onChange={set("deadline")} min={new Date().toISOString().split("T")[0]} />
                  </div>
                  <div>
                    <Label required>Hiring Manager</Label>
                    <Input placeholder="e.g. Priya Sharma" value={form.hiring_manager} onChange={set("hiring_manager")} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Interview Process</Label>
                    <Textarea rows={3} placeholder="e.g. Round 1: HR Screening..." value={form.interview_process || ""} onChange={set("interview_process")} />
                  </div>
                  <div>
                    <Label>Keywords / Tags</Label>
                    <Input placeholder="e.g. react, frontend, remote" value={form.keywords || ""} onChange={set("keywords")} />
                  </div>
                  <div>
                    <Label required>Job Status</Label>
                    <Select value={form.status} onChange={set("status")}>
                      <option value="Draft">Draft</option>
                      <option value="Published">Published</option>
                    </Select>
                  </div>
                </div>
              </SectionCard>

              <div className="flex items-center justify-between pt-2 pb-6">
                <p className="text-xs text-gray-400">
                  Created: {new Date(form.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} &nbsp;·&nbsp; Job ID: #{id}
                </p>
                <div className="flex items-center gap-3">
                  <Link href="/Recruitment/job-description">
                    <button type="button" className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer shadow-sm">
                      Cancel
                    </button>
                  </Link>
                  <button type="submit" disabled={loading}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer shadow-sm shadow-indigo-200 disabled:opacity-50">
                    {loading ? "Saving..." : "Update Job"}
                  </button>
                </div>
              </div>
            </form>
          </main>
        </div>
      </div>
    </>
  );
}
