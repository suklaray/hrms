import SideBar from "@/Components/SideBar";

export default function ManualAttendance() {
  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-100 to-purple-100 flex">
      <SideBar />
      <div className="flex-1 flex justify-center items-center">
        <div className="bg-white shadow-2xl rounded-3xl p-10 w-full max-w-5xl space-y-6">
          <h2 className="text-3xl font-bold text-center text-indigo-700">Manual Attendance Tracker</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 text-lg font-medium">Employee ID</label>
              <input type="text" className="w-full mt-2 p-3 rounded-xl border border-gray-300" />
            </div>
            <div>
              <label className="block text-gray-700 text-lg font-medium">Employee Name</label>
              <input type="text" className="w-full mt-2 p-3 rounded-xl border border-gray-300" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 text-lg font-medium">Date</label>
              <input type="date" className="w-full mt-2 p-3 rounded-xl border border-gray-300" />
            </div>
            <div>
              <label className="block text-gray-700 text-lg font-medium">Status</label>
              <select className="w-full mt-2 p-3 rounded-xl border border-gray-300">
                <option>Present</option>
                <option>Absent</option>
                <option>Half Day</option>
                <option>On Leave</option>
              </select>
            </div>
          </div>

          <button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-lg font-semibold py-3 rounded-xl hover:from-purple-700 hover:to-indigo-700">
            Submit Attendance
          </button>
        </div>
      </div>
    </div>
  );
}
