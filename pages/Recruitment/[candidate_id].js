import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import SideBar from "@/Components/SideBar";
import { format } from 'date-fns';
import { AiOutlineEye } from 'react-icons/ai';
import Image from 'next/image';

export default function CandidateDetails() {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const router = useRouter();
  const { candidate_id } = router.query; // to get the candidate_id from the URL

  useEffect(() => {
  const fetchCandidateDetails = async () => {
    try {
      const res = await axios.get(`/api/recruitment/getEmployeeById?id=${candidate_id}`);
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
      <div className="flex h-screen bg-gradient-to-r from-indigo-100 to-purple-100 overflow-y-auto">
        <SideBar />
        <div className="flex-1 p-10 sm:p-16">
          <h1 className="text-4xl font-extrabold text-indigo-600 mb-8 text-center">Candidate Details</h1>
  
          <div className="bg-white p-10 rounded-3xl shadow-2xl space-y-10 transform hover:scale-[1.02] transition duration-300 ease-in-out">
            {/* Profile Image */}
            <div className="flex justify-center">
              <Image
                src={candidate.profile_photo || '/profile.png'}
                alt="Profile"
                 width={160}
                height={160}
                className="rounded-full object-cover border-4 border-indigo-300 shadow-xl"
              />
            </div>
  
            {/* Candidate Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                ['Name', candidate.name],
                ['Email', candidate.email],
                ['Contact No', candidate.contact_no],
                ['Gender', candidate.gender],
                ['Date of Birth', candidate.dob],
                ['Address', candidate.address],
                ['Bank Details', candidate.bank_details],
              ].map(([label, value], i) => (
                <div key={i} className="flex items-center gap-2">
                  <strong className="text-gray-800">{label}:</strong>
                  <span className="text-gray-700">{value}</span>
                </div>
              ))}
  
              {/* Aadhar Card */}
              <div className="flex items-center gap-2">
                <strong className="text-gray-800">Aadhar Card:</strong>
                {candidate.aadhar_card ? (
                  <a
                    href={candidate.aadhar_card}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                    title="View Aadhar"
                  >
                    <AiOutlineEye size={20} />
                  </a>
                ) : (
                  <span className="text-gray-500">No Aadhar available</span>
                )}
              </div>
  
              {/* PAN Card */}
              <div className="flex items-center gap-2">
                <strong className="text-gray-800">PAN Card:</strong>
                {candidate.pan_card ? (
                  <a
                    href={candidate.pan_card}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                    title="View PAN"
                  >
                    <AiOutlineEye size={20} />
                  </a>
                ) : (
                  <span className="text-gray-500">No PAN available</span>
                )}
              </div>
  
              {/* Resume */}
              <div className="flex items-center gap-2">
                <strong className="text-gray-800">Resume:</strong>
                {candidate.resume ? (
                  <a
                    href={candidate.resume}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                    title="View Resume"
                  >
                    <AiOutlineEye size={20} />
                  </a>
                ) : (
                  <span className="text-gray-500">No Resume available</span>
                )}
              </div>
  
              {/* Experience Certificate */}
              <div className="flex items-center gap-2">
                <strong className="text-gray-800">Experience Certificate:</strong>
                {candidate.experience_certificate ? (
                  <a
                    href={candidate.experience_certificate}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                    title="View Certificate"
                  >
                    <AiOutlineEye size={20} />
                  </a>
                ) : (
                  <span className="text-gray-500">No Certificate available</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }