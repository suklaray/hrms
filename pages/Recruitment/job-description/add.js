import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import SideBar from "@/Components/SideBar";
import { ChevronDown, X } from "lucide-react";
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

export default function AddJobDescription() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "", department: "", employment_type: "", work_mode: "",
    location: "", openings: "", experience: "", education: "",
    required_skills: [], preferred_skills: [],
    responsibilities: "", summary: "",
    salary_min: "", salary_max: "", benefits: "",
    deadline: "", hiring_manager: "", interview_process: "", keywords: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [departments, setDepartments] = useState([]);
  const [hrUsers, setHrUsers] = useState([]);
  const [userRole, setUserRole] = useState("");

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (status) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/recruitment/job-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      router.push("/Recruitment/job-description");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setUserRole(data.user?.role?.toLowerCase() || ""));

    fetch("/api/settings/departments")
      .then(r => r.json())
      .then(data => setDepartments(Array.isArray(data) ? data : []));

    fetch("/api/hr/users")
      .then(r => r.json())
      .then(data => {
        const users = Array.isArray(data?.users) ? data.users : [];
        setHrUsers(users.filter((user) => user.role?.toLowerCase() === "hr"));
      });
  }, []);

  return (
    <>
      <Head><title>Add Job Description - HRMS</title></Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
            <div>
              <nav className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                {userRole === "recruiter" ? (
                  <span>Recruitment</span>
                ) : (
                  <Link href="/Recruitment/recruitment" className="hover:text-indigo-600 transition-colors">Recruitment</Link>
                )}
                <span>/</span>
                <Link href="/Recruitment/job-description" className="hover:text-indigo-600 transition-colors">Job Descriptions</Link>
                <span>/</span>
                <span className="text-gray-600 font-medium">Add Job</span>
              </nav>
              <h1 className="text-xl font-bold text-gray-900">Add Job Description</h1>
              <p className="text-sm text-gray-400 mt-0.5">Create a new job description for recruitment.</p>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-5 py-3 mb-5">{error}</div>
            )}
            <form onSubmit={(e) => e.preventDefault()}>
              <SectionCard title="Basic Information" subtitle="General details about the job position">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <Label required>Job Title</Label>
                    <Input placeholder="e.g. Senior Frontend Developer" value={form.title} onChange={set("title")} />
                  </div>
                  <div>
                    <div>
                      <Label required>Department</Label>
                      <Select value={form.department} onChange={set("department")}>
                        <option value="">Select department</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                      </Select>
                    </div>
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
                    <MultiSelect selected={form.required_skills}
                      onChange={(v) => setForm((f) => ({ ...f, required_skills: v }))}
                      placeholder="Search and select required skills..." />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Preferred Skills</Label>
                    <MultiSelect selected={form.preferred_skills}
                      onChange={(v) => setForm((f) => ({ ...f, preferred_skills: v }))}
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
                    <Input placeholder="e.g. ₹8,00,000" value={form.salary_min} onChange={set("salary_min")} />
                  </div>
                  <div>
                    <Label>Salary Range (Max)</Label>
                    <Input placeholder="e.g. ₹14,00,000" value={form.salary_max} onChange={set("salary_max")} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Benefits & Perks</Label>
                    <Textarea rows={3} placeholder="e.g. Health insurance, flexible hours..." value={form.benefits} onChange={set("benefits")} />
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
                    <Select value={form.hiring_manager} onChange={set("hiring_manager")}>
                      <option value="">Select HR hiring manager</option>
                      {hrUsers.map((user) => (
                        <option key={user.empid} value={user.name}>{user.name}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Interview Process</Label>
                    <Textarea rows={3} placeholder="e.g. Round 1: HR Screening, Round 2: Technical..." value={form.interview_process} onChange={set("interview_process")} />
                  </div>
                  <div>
                    <Label>Keywords / Tags</Label>
                    <Input placeholder="e.g. react, frontend, remote" value={form.keywords} onChange={set("keywords")} />
                  </div>
                </div>
              </SectionCard>

              <div className="flex items-center justify-end gap-3 pt-2 pb-6">
                <Link href="/Recruitment/job-description">
                  <button type="button" className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer shadow-sm">
                    Cancel
                  </button>
                </Link>
                <button type="button" onClick={() => submit("Draft")} disabled={loading}
                  className="px-5 py-2.5 text-sm font-medium text-indigo-600 bg-white border border-indigo-300 rounded-xl hover:bg-indigo-50 transition-colors cursor-pointer shadow-sm disabled:opacity-50">
                  {loading ? "Saving..." : "Save Draft"}
                </button>
                <button type="button" onClick={() => submit("Published")} disabled={loading}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer shadow-sm shadow-indigo-200 disabled:opacity-50">
                  {loading ? "Publishing..." : "Publish Job"}
                </button>
              </div>
            </form>
          </main>
        </div>
      </div>
    </>
  );
}
