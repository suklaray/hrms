import SideBar from "@/Components/SideBar";
import { useRouter } from "next/router";

export default function RecruitmentDashboard() {
  const router = useRouter();

  return (
    <div className="flex">
      <SideBar />
      <div className="p-6 h-screen w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4">Recruitment Management</h1>

          <button 
            className="text-white px-4 py-2 bg-indigo-600 rounded"
            onClick={() => router.push("/Recruitment/addCandidates")}>
            + ADD CANDIDATE
          </button>
        </div>
      </div>
    </div>
  );
}
