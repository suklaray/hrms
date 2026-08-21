import { useState, useRef } from 'react';
import Head from 'next/head';
import SideBar from '@/Components/SideBar';
import { toast } from 'react-toastify';
import {
  Upload, FileText, X, Loader2, ChevronDown, ChevronUp,
  User, Briefcase, GraduationCap, Award, Globe, CheckCircle, AlertCircle,
} from 'lucide-react';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];
const ALLOWED_EXTS = ['.pdf', '.doc', '.docx', '.txt'];
const MAX_SIZE = 5 * 1024 * 1024;

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <Icon className="w-4 h-4 text-indigo-500" />
          {title}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="p-5 bg-white">{children}</div>}
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value || <span className="text-gray-300 font-normal">—</span>}</p>
    </div>
  );
}

function TagList({ label, items }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
      {(items || []).length === 0
        ? <span className="text-sm text-gray-300">—</span>
        : <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <span key={i} className="bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full px-3 py-0.5 text-sm">{item}</span>
          ))}
        </div>
      }
    </div>
  );
}

export default function JobApplications() {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [recordId, setRecordId] = useState(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  function handleFileSelect(file) {
    setFileError('');
    setParsedData(null);
    setRecordId(null);
    if (!file) return;
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTS.includes(ext)) {
      setFileError('Unsupported file type. Allowed: PDF, DOC, DOCX, TXT.');
      return;
    }
    if (file.size > MAX_SIZE) { setFileError('File size exceeds 5 MB limit.'); return; }
    if (file.size === 0) { setFileError('File is empty.'); return; }
    setSelectedFile(file);
  }

  function clearFile() {
    setSelectedFile(null);
    setFileError('');
    setParsedData(null);
    setRecordId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleParse() {
    if (!selectedFile) return;
    setParsing(true);
    setParsedData(null);
    setRecordId(null);
    const formData = new FormData();
    formData.append('resume', selectedFile);
    try {
      const res = await fetch('/api/recruitment/job-applications/parse-resume', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) { toast.error(json.error || 'Parsing failed.'); return; }
      setParsedData(json.data);
      setRecordId(json.recordId);
      toast.success('Resume parsed and saved successfully!');
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setParsing(false);
    }
  }

  async function handleViewResume() {
    if (!recordId) return;

    setLoadingUrl(true);

    try {
      const res = await fetch(
        `/api/recruitment/job-applications/resume-url/${recordId}`
      );

      const json = await res.json();

      if (!res.ok || !json.success || !json.url) {
        toast.error(json.error || "Could not get resume URL.");
        return;
      }

      // If API returns an absolute URL, use it directly.
      // If it returns a relative URL, prepend the current origin.
      const resumeUrl = json.url.startsWith("http")
        ? json.url
        : `${window.location.origin}${json.url}`;

      window.open(
        resumeUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      console.error("View resume error:", error);
      toast.error("Could not open resume.");
    } finally {
      setLoadingUrl(false);
    }
  }
  return (
    <>
      <Head><title>Job Applications - HRMS</title></Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 overflow-auto p-6 lg:p-10">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Resume Parser</h1>
            <p className="text-gray-500 mt-1">Upload a resume to extract candidate information.</p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">

            {/* Upload Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-500" />
                Resume Parser
              </h2>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files[0]); }}
                onClick={() => !selectedFile && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
                  ${selectedFile ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}`}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-4">
                    <FileText className="w-10 h-10 text-indigo-500 flex-shrink-0" />
                    <div className="text-left">
                      <p className="font-medium text-gray-800">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">{formatBytes(selectedFile.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); clearFile(); }}
                      className="ml-4 p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Drag & drop or click to upload</p>
                    <p className="text-sm text-gray-400 mt-1">PDF, DOC, DOCX, TXT — max 5 MB</p>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files[0])}
              />

              {fileError && (
                <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {fileError}
                </div>
              )}

              <button
                type="button"
                onClick={handleParse}
                disabled={!selectedFile || !!fileError || parsing}
                className={`mt-4 w-full py-3 rounded-xl font-semibold text-white transition-all
                  ${selectedFile && !fileError && !parsing
                    ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                    : 'bg-gray-300 cursor-not-allowed'}`}
              >
                {parsing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Parsing resume...
                  </span>
                ) : 'Parse Resume'}
              </button>
            </div>

            {/* Parsed Data Display */}
            {parsedData && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Extracted Information
                  </h2>
                  <div className="flex items-center gap-2">
                    {recordId && (
                      <button
                        type="button"
                        onClick={handleViewResume}
                        disabled={loadingUrl}
                        className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {loadingUrl
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <FileText className="w-4 h-4" />
                        }
                        View Resume
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={clearFile}
                      className="px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors cursor-pointer"
                    >
                      Clear & Parse Another
                    </button>
                  </div>
                </div>

                <Section title="Personal Information" icon={User}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoField label="Full Name" value={parsedData.personalInformation.fullName} />
                    <InfoField label="Email Address" value={parsedData.personalInformation.emailAddress} />
                    <InfoField label="Mobile Number" value={parsedData.personalInformation.mobileNumber} />
                    <InfoField label="Alternate Phone" value={parsedData.personalInformation.alternatePhoneNumber} />
                    <InfoField label="City" value={parsedData.personalInformation.city} />
                    <InfoField label="State" value={parsedData.personalInformation.state} />
                    <InfoField label="Country" value={parsedData.personalInformation.country} />
                    <InfoField label="Current Address" value={parsedData.personalInformation.currentAddress} />
                    <InfoField label="LinkedIn" value={parsedData.personalInformation.linkedInProfile} />
                    <InfoField label="GitHub" value={parsedData.personalInformation.githubUrl} />
                    <InfoField label="Portfolio URL" value={parsedData.personalInformation.portfolioUrl} />
                  </div>
                </Section>

                <Section title="Professional Information" icon={Briefcase}>
                  <div className="space-y-4">
                    <InfoField label="Career Objective" value={parsedData.professionalInformation.careerObjective} />
                    <InfoField label="Professional Summary" value={parsedData.professionalInformation.professionalSummary} />
                  </div>
                </Section>

                <Section title={`Work Experience (${parsedData.workExperience.length})`} icon={Briefcase}>
                  {parsedData.workExperience.length === 0
                    ? <p className="text-sm text-gray-400">No work experience found.</p>
                    : parsedData.workExperience.map((exp, i) => (
                      <div key={i} className="border border-gray-100 rounded-lg p-4 mb-3">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-800">{exp.jobTitle || '—'}</p>
                            <p className="text-sm text-indigo-600">{exp.companyName || '—'}</p>
                            {exp.employmentType && <p className="text-xs text-gray-400 mt-0.5">{exp.employmentType}</p>}
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <p>{exp.startDate}{exp.endDate ? ` — ${exp.endDate}` : exp.currentEmployer ? ' — Present' : ''}</p>
                            {exp.totalDuration && <p className="text-xs text-gray-400">{exp.totalDuration}</p>}
                          </div>
                        </div>
                        {exp.responsibilities?.length > 0 && (
                          <ul className="list-disc list-inside space-y-1 mt-2">
                            {exp.responsibilities.map((r, j) => (
                              <li key={j} className="text-sm text-gray-600">{r}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))
                  }
                </Section>

                <Section title={`Education (${parsedData.education.length})`} icon={GraduationCap}>
                  {parsedData.education.length === 0
                    ? <p className="text-sm text-gray-400">No education records found.</p>
                    : <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                            <th className="px-4 py-2 text-left font-medium">Degree</th>
                            <th className="px-4 py-2 text-left font-medium">Specialization</th>
                            <th className="px-4 py-2 text-left font-medium">Institution</th>
                            <th className="px-4 py-2 text-left font-medium">University</th>
                            <th className="px-4 py-2 text-left font-medium">Year</th>
                            <th className="px-4 py-2 text-left font-medium">%</th>
                            <th className="px-4 py-2 text-left font-medium">CGPA</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {parsedData.education.map((edu, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-800 font-medium">{edu.degree || '—'}</td>
                              <td className="px-4 py-3 text-gray-600">{edu.specialization || '—'}</td>
                              <td className="px-4 py-3 text-gray-600">{edu.institutionName || '—'}</td>
                              <td className="px-4 py-3 text-gray-600">{edu.university || '—'}</td>
                              <td className="px-4 py-3 text-gray-600">{edu.graduationYear || '—'}</td>
                              <td className="px-4 py-3 text-gray-600">{edu.percentage || '—'}</td>
                              <td className="px-4 py-3 text-gray-600">{edu.cgpa || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  }
                </Section>

                <Section title="Skills" icon={Award}>
                  <div className="space-y-3">
                    <TagList label="Technical Skills" items={parsedData.skills.technicalSkills} />
                    <TagList label="Soft Skills" items={parsedData.skills.softSkills} />
                  </div>
                </Section>

                <Section title="Additional Information" icon={Globe} defaultOpen={false}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoField label="Notice Period" value={parsedData.additionalInformation.noticePeriod} />
                    <InfoField label="Current Salary" value={parsedData.additionalInformation.currentSalary} />
                    <InfoField label="Expected Salary" value={parsedData.additionalInformation.expectedSalary} />
                    <InfoField label="Preferred Location" value={parsedData.additionalInformation.preferredLocation} />
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TagList label="Certifications" items={parsedData.certifications} />
                    <TagList label="Languages Known" items={parsedData.languagesKnown} />
                  </div>
                </Section>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
