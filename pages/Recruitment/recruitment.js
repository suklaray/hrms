import { useEffect, useState } from "react";
import axios from "axios";
import SideBar from "@/Components/SideBar";
import Link from "next/link";
import { FaEye, FaEdit, FaTrash } from "react-icons/fa";
import { FaClock, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

export default function Candidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [joiningDate, setJoiningDate] = useState("");
  const [role, setRole] = useState("");

  const fetchCandidates = async () => {
    try {
      const res = await axios.get("/api/recruitment/getCandidates");
      setCandidates(res.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleStatusChange = async (candidateId, newStatus) => {
    try {
      await axios.put("/api/recruitment/updateHRStatus", {
        candidateId,
        hrStatus: newStatus,
      });
      fetchCandidates();
    } catch (error) {
      console.error("Error updating HR status:", error);
    }
  };

  const handleInterviewMail = async (candidateId) => {
    try {
      await axios.put("/api/recruitment/sendInterviewMail", {
        candidateId,
        status: "Interview Mail Sent",
      });
      fetchCandidates();
    } catch (error) {
      console.error("Error sending interview mail:", error);
    }
  };

  const handleFormMail = async (candidateId) => {
    try {
      await axios.put("/api/recruitment/sendFormMail", {
        candidateId,
        status: "Form Mail Sent",
      });
      fetchCandidates();
    } catch (error) {
      console.error("Error sending form mail:", error);
    }
  };

  const handleDateChange = async (candidateId, newDate) => {
    try {
      await axios.put("/api/recruitment/updateInterviewDate", {
        candidateId,
        interviewDate: newDate,
      });
      fetchCandidates();
    } catch (error) {
      console.error("Error updating interview date:", error);
    }
  };

  const handleDelete = async (candidateId) => {
    if (window.confirm("Are you sure you want to delete this candidate?")) {
      try {
        await axios.delete(`/api/recruitment/deleteCandidate?candidate_id=${candidateId}`);
        fetchCandidates();
      } catch (error) {
        console.error("Error deleting candidate:", error);
      }
    }
  };

  const handleEmp = async (candidateId, newDate) => {
    try {
      await axios.put("/api/recruitment/addEmployee", {
        candidateId,
        interviewDate: newDate,
      });
      fetchCandidates();
    } catch (error) {
      console.error("Error updating interview date:", error);
    }
  };

  const handleVerification = async (candidate) => {
    try {
      const updatedVerificationStatus = !candidate.verification;
  
      await axios.put("/api/recruitment/verifyCandidate", {
        candidateId: candidate.id,
        verificationStatus: updatedVerificationStatus, 
      });
  
      fetchCandidates(); 
    } catch (error) {
      console.error("Error updating verification status:", error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 bg-gradient-to-r from-gray-100 via-indigo-100 to-pink-100">
      <SideBar />
      <div className="w-full p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-extrabold text-indigo-700">Candidate List</h1>
          <Link href="/Recruitment/addCandidates">
            <button className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-2 rounded-lg shadow-lg hover:from-indigo-600 hover:to-purple-700 transition duration-300">
              + Add Candidate
            </button>
          </Link>
        </div>

        {loading ? (
          <p className="text-lg text-gray-500">Loading candidates...</p>
        ) : (
          <div className="overflow-x-auto shadow-2xl rounded-3xl bg-white border border-indigo-800 ">
            <table className="min-w-full divide-y divide-indigo-200 text-sm text-gray-800">
              <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white uppercase text-xs font-bold sticky top-0 z-10">
                <tr>
                  {["ID", "Name", "Email", "Contact No.", "Interview Date", "Send Interview Mail", "HR Decision", "Form Link", "Send Form Mail", "Verification", "Actions", "employment"].map((head) => (
                    <th key={head} className="px-6 py-4 text-left tracking-wider">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {candidates.map((candidate, index) => (
                  <tr
                    key={candidate.candidate_id}
                    className={`transition-all duration-300 hover:bg-indigo-300 ${index % 2 === 0 ? "bg-white" : "bg-indigo-50"}`}
                  >
                    <td className="px-6 py-4 font-semibold text-indigo-700">
                      #{candidate.candidate_id}
                    </td>
                    <td className="px-6 py-4 font-medium">{candidate.name}</td>
                    <td className="px-6 py-4 text-gray-600">{candidate.email}</td>
                    <td className="px-6 py-4 text-gray-600">{candidate.contact_number}</td>
                    <td className="px-6 py-4">
                      <input
                        type="date"
                        value={candidate.interview_date ? candidate.interview_date.split("T")[0] : ""}
                        onChange={(e) => handleDateChange(candidate.candidate_id, e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1 text-sm shadow-inner focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <button
                        className={`text-xs font-bold px-4 py-1 rounded-full shadow transition duration-200 ${candidate.interview_mail_status === "Interview Mail Sent" ? "bg-green-100 text-green-700 ring-1 ring-green-300" : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"}`}
                        onClick={() => handleInterviewMail(candidate.candidate_id)}
                      >
                        {candidate.interview_mail_status === "Interview Mail Sent" ? "Mail Sent" : "Send Mail"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={candidate.status || "Waiting"}
                        onChange={(e) => handleStatusChange(candidate.candidate_id, e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white shadow-sm"
                      >
                        <option value="Waiting">Waiting</option>
                        <option value="Selected">Selected</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      {candidate.form_link ? (
                        <a href={candidate.form_link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm font-medium">
                          View Form
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm italic">No form</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        className={`text-xs font-bold px-4 py-1 rounded-full transition duration-200 ${candidate.form_mail_status === "Form Mail Sent" ? "bg-green-100 text-green-700 ring-1 ring-green-300" : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"}`}
                        onClick={() => handleFormMail(candidate.candidate_id)}
                      >
                        {candidate.form_mail_status === "Form Mail Sent" ? "Form Sent" : "Send Form"}
                      </button>
                    </td>

                    {/* Verification Button */}
                    <td className="px-6 py-4">
                          <button
                            className={`px-4 py-1 text-xs font-semibold rounded-full transition ${candidate.verification ? "bg-green-100 text-green-700 cursor-default" : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"}`}
                            onClick={() => {
                              if (!candidate.verification) {
                                handleVerification(candidate); // Trigger the verification update
                              }
                            }}
                            disabled={candidate.verification} // Disable the button if already verified
                          >
                            {candidate.verification ? "Verified" : "Not Verified"}
                          </button>
                        </td>
                    <td className="px-6 py-4 flex gap-3 items-center">
                      <Link href={`/Recruitment/${candidate.candidate_id}`}>
                        <button className="text-indigo-600 hover:bg-indigo-100 p-2 rounded-full transition" title="View">
                          <FaEye size={16} />
                        </button>
                      </Link>
                      <button
                        className="text-yellow-600 hover:bg-yellow-100 p-2 rounded-full transition"
                        onClick={() => console.log("Edit clicked")}
                        title="Edit"
                      >
                        <FaEdit size={16} />
                      </button>
                      <button
                        className="text-red-600 hover:bg-red-100 p-2 rounded-full transition"
                        onClick={() => handleDelete(candidate.candidate_id)}
                        title="Delete"
                      >
                        <FaTrash size={16} />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link href={`/Recruitment/add/${candidate.id}`}>
                       <button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:bg-green-600 text-white px-4 py-2 rounded-lg">
                            Add as Employee
                        </button>
                    </Link>
                    </td>
                          

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
