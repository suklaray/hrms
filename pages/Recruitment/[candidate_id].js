import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import Head from "next/head";
import SideBar from "@/Components/SideBar";
import Breadcrumb from "@/Components/Breadcrumb";
import { format } from 'date-fns';
import { 
  FaUser, FaEnvelope, FaPhone, FaCalendarAlt, 
  FaCheckCircle, FaTimesCircle, FaFileAlt, FaEye,
  FaIdCard, FaUserCheck, FaArrowLeft, FaEdit,
  FaVoicemail,
  FaMailBulk
} from 'react-icons/fa';

export default function CandidateDetails() {
  const [candidate, setCandidate] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const router = useRouter();
  const { candidate_id } = router.query;

  useEffect(() => {
    const fetchCandidateDetails = async () => {
      try {
        const res = await axios.get(`/api/recruitment/getCandidateById?id=${candidate_id}`);
        setCandidate(res.data);
        
        // If form is submitted, fetch employee details
        if (res.data.form_submitted) {
          try {
            const empRes = await axios.get(`/api/recruitment/getEmployeeById?id=${candidate_id}`);
            setEmployee(empRes.data);
          } catch (empError) {
            console.error("Error fetching employee details:", empError);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching candidate details:", error);
        setError("Failed to load candidate details.");
        setLoading(false);
      }
    };

    if (candidate_id) {
      fetchCandidateDetails();
    }
  }, [candidate_id]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <SideBar />
        <div className="flex-1 p-6 lg:p-10">
          <Breadcrumb items={[
            { label: 'Recruitment', href: '/Recruitment/recruitment' },
            { label: 'Candidate Details' }
          ]} />
          
          <div className="mb-8 mt-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Candidate Profile</h1>
            <p className="text-gray-600">Loading candidate information...</p>
          </div>
          
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-xl font-semibold text-gray-700">Loading candidate details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-r from-red-500 to-yellow-600 text-white">
        <p className="text-2xl font-bold">{error}</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-r from-gray-500 to-gray-700 text-white">
        <p className="text-2xl font-bold">No candidate found.</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'selected': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'waiting': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <>
      <Head>
        <title>Candidate Profile - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <SideBar />
      <div className="flex-1 p-6 lg:p-10">
        <Breadcrumb items={[
          { label: 'Recruitment', href: '/Recruitment/recruitment' },
          { label: candidate?.name || 'Candidate Details' }
        ]} />

        {/* Header */}
        <div className="mb-8 mt-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Candidate Profile</h1>
          <p className="text-gray-600">Complete candidate information and status</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center text-white text-xl font-semibold capitalize">
                  <FaUser className="mr-2" />
                  <span>{candidate.name}</span>
                </div>
                {/* <div className="flex items-center text-indigo-100 text-md font-semibold">
                  <FaEnvelope className="mr-2" />
                  <span>Email: {candidate.email}</span>
                </div> */}
              </div>
              <div className="flex items-center">
                <div className={`px-4 py-2 rounded-full border-2 font-semibold mr-3 ${getStatusColor(candidate.status)}`}>
                  {candidate.status || 'Pending'}
                </div>
                <button 
                  onClick={() => router.push(`/Recruitment/edit/${candidate.candidate_id}`)}
                  className="flex items-center px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                >
                  <FaEdit className="mr-2" />
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Contact Information */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FaUser className="mr-2 text-indigo-500" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                  <FaEnvelope className="text-indigo-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Email Address</p>
                    <p className="font-semibold text-gray-900">{candidate.email}</p>
                  </div>
                </div>
                <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                  <FaPhone className="text-indigo-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Contact Number</p>
                    <p className="font-semibold text-gray-900">{candidate.contact_number || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interview & Status Information */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FaCalendarAlt className="mr-2 text-indigo-500" />
                Interview & Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                  <FaCalendarAlt className="text-indigo-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Interview Date & Time</p>
                    <p className="font-semibold text-gray-900">
                      {candidate.interview_date ? format(new Date(candidate.interview_date), "dd MMM yyyy") : "Not scheduled"}
                      {candidate.interview_timing && ` at ${candidate.interview_timing}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                  <FaUserCheck className="text-indigo-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Verification Status</p>
                    <div className="flex items-center mt-1">
                      {candidate.verification ? (
                        <><FaCheckCircle className="text-green-500 mr-1" /><span className="text-green-600 font-semibold">Verified</span></>
                      ) : (
                        <><FaTimesCircle className="text-red-500 mr-1" /><span className="text-red-600 font-semibold">Not Verified</span></>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                  <FaFileAlt className="text-indigo-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Form Submitted</p>
                    <div className="flex items-center mt-1">
                      {candidate.form_submitted ? (
                        <><FaCheckCircle className="text-green-500 mr-1" /><span className="text-green-600 font-semibold">Yes</span></>
                      ) : (
                        <><FaTimesCircle className="text-red-500 mr-1" /><span className="text-red-600 font-semibold">No</span></>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FaFileAlt className="mr-2 text-indigo-500" />
                Documents
              </h3>
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FaFileAlt className="text-indigo-500 mr-3 text-xl" />
                    <div>
                      <p className="font-semibold text-gray-900">Resume</p>
                      <p className="text-sm text-gray-600">Candidate&apos;s resume document</p>
                    </div>
                  </div>
                  {candidate.resume ? (
                    <a 
                      href={`/api/recruitment/download-resume/${candidate.candidate_id}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <FaEye className="mr-2" />
                      View Resume
                    </a>
                  ) : (
                    <span className="px-4 py-2 bg-gray-200 text-gray-500 rounded-lg">No resume available</span>
                  )}
                </div>
              </div>
            </div>

            {/* Employee Details Section - Only show if form is submitted */}
            {candidate.form_submitted && employee && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <FaUserCheck className="mr-2 text-green-500" />
                  Employee Details
                </h3>
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="flex items-center p-4 bg-white rounded-lg shadow-sm">
                      <FaIdCard className="text-green-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Candidate ID</p>
                        <p className="font-semibold text-gray-900">{employee.candidate_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center p-4 bg-white rounded-lg shadow-sm">
                      <FaUser className="text-green-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Full Name</p>
                        <p className="font-semibold text-gray-900">{employee.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center p-4 bg-white rounded-lg shadow-sm">
                      <FaEnvelope className="text-green-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-semibold text-gray-900">{employee.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center p-4 bg-white rounded-lg shadow-sm">
                      <FaPhone className="text-green-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Contact</p>
                        <p className="font-semibold text-gray-900">{employee.contact_no || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-center p-4 bg-white rounded-lg shadow-sm">
                      <FaCalendarAlt className="text-green-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Date of Birth</p>
                        <p className="font-semibold text-gray-900">
                          {employee.dob ? format(new Date(employee.dob), "dd MMM yyyy") : "Not provided"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center p-4 bg-white rounded-lg shadow-sm">
                      <FaUser className="text-green-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Gender</p>
                        <p className="font-semibold text-gray-900">{employee.gender || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Additional Employee Info */}
                  <div className="mt-6 pt-6 border-t border-green-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center p-4 bg-white rounded-lg shadow-sm">
                        <FaFileAlt className="text-green-500 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600">Highest Qualification</p>
                          <p className="font-semibold text-gray-900">{employee.highest_qualification || 'Not provided'}</p>
                        </div>
                      </div>
                      <div className="flex items-center p-4 bg-white rounded-lg shadow-sm">
                        <FaCalendarAlt className="text-green-500 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600">Registration Date</p>
                          <p className="font-semibold text-gray-900">
                            {employee.created_at ? format(new Date(employee.created_at), "dd MMM yyyy") : "Not available"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Employee Documents */}
                  <div className="mt-6 pt-6 border-t border-green-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Submitted Documents</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { label: 'Aadhar Card', file: employee.aadhar_card, key: 'aadhar' },
                        { label: 'PAN Card', file: employee.pan_card, key: 'pan' },
                        { label: 'Resume', file: employee.resume, key: 'resume' },
                        { label: 'Education Certificates', file: employee.education_certificates, key: 'education' },
                        { label: 'Experience Certificate', file: employee.experience_certificate, key: 'experience' },
                        { label: 'Profile Photo', file: employee.profile_photo, key: 'photo' }
                      ].map((doc) => (
                        <div key={doc.key} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border">
                          <div className="flex items-center">
                            <FaFileAlt className="text-green-500 mr-2" />
                            <span className="text-sm font-medium text-gray-700">{doc.label}</span>
                          </div>
                          {doc.file ? (
                            <a 
                              href={doc.file} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex items-center px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors"
                            >
                              <FaEye className="mr-1" />
                              View
                            </a>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">Not uploaded</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
