import SideBar from "@/Components/SideBar";
import { useRouter } from "next/router";
import { Users, Plus, Calendar } from "lucide-react";

export default function RecruitmentDashboard() {
  const router = useRouter();

  const handleLogout = () => {
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-200 via-white to-purple-200">
      <SideBar handleLogout={handleLogout} />
      <div className="flex-1 p-6">
        {/* Header */}
        <div className="bg-white shadow-xl rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-indigo-700">Recruitment Management</h1>
              <p className="text-gray-600 mt-1">Manage candidates and recruitment process</p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
            onClick={() => router.push("/Recruitment/addCandidates")}
            className="bg-white shadow-xl rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 group"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl group-hover:from-indigo-600 group-hover:to-purple-600 transition-all">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-800">Add Candidate</h3>
                <p className="text-gray-600 text-sm">Register new candidate</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push("/Recruitment/recruitment")}
            className="bg-white shadow-xl rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 group"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl group-hover:from-green-600 group-hover:to-teal-600 transition-all">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-800">View Candidates</h3>
                <p className="text-gray-600 text-sm">Manage all candidates</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
