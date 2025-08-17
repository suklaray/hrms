import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import SideBar from "@/Components/SideBar";
import { format } from 'date-fns';
import { AiOutlineEye } from 'react-icons/ai';

export default function CandidateDetails() {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const router = useRouter();
  const { candidate_id } = router.query;

  useEffect(() => {
    const fetchCandidateDetails = async () => {
      try {
        const res = await axios.get(`/api/recruitment/getCandidateById?id=${candidate_id}`);
        setCandidate(res.data);
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
      <div className="flex justify-center items-center h-screen bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <p className="text-2xl font-bold">Loading candidate details...</p>
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

  return (
    <div className="flex min-h-screen bg-gradient-to-r from-indigo-100 to-purple-100 overflow-y-auto">
      <SideBar />
      <div className="flex-1 p-10 sm:p-16">
        <h1 className="text-4xl font-extrabold text-indigo-600 mb-8 text-center">Candidate Details</h1>

        <div className="bg-white p-10 rounded-3xl shadow-2xl space-y-10 transform hover:scale-[1.02] transition duration-300 ease-in-out">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{candidate.name}</h2>
            <p className="text-gray-600">Candidate ID: {candidate.candidate_id}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              ['Name', candidate.name],
              ['Email', candidate.email],
              ['Contact Number', candidate.contact_number],
              ['Interview Date', candidate.interview_date ? format(new Date(candidate.interview_date), "dd/MM/yyyy") : "N/A"],
              ['Status', candidate.status],
              ['Form Status', candidate.form_status],
              ['Interview Mail Status', candidate.interview_mail_status],
              ['Verification', candidate.verification ? 'Verified' : 'Not Verified'],
              ['Form Submitted', candidate.form_submitted ? 'Yes' : 'No'],
            ].map(([label, value], i) => (
              <div key={i} className="flex items-center gap-2">
                <strong className="text-gray-800">{label}:</strong>
                <span className="text-gray-700">{value || "N/A"}</span>
              </div>
            ))}

            {/* File Links */}
            {[
              ['Resume', candidate.resume],
            ].map(([label, file], i) => (
              <div key={i} className="flex items-center gap-2">
                <strong className="text-gray-800">{label}:</strong>
                {file ? (
                  <a href={file} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800" title={`View ${label}`}>
                    <AiOutlineEye size={20} />
                  </a>
                ) : (
                  <span className="text-gray-500">No {label} available</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
