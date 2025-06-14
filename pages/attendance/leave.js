import SideBar from "@/Components/SideBar";

export default function LeaveManagement() {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-indigo-100 to-white flex">
        <SideBar/>
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white shadow-xl rounded-3xl w-full max-w-4xl p-10">
            <h2 className="text-3xl font-bold text-indigo-700 mb-8 text-center">Leave Management Portal</h2>
  
            <div className="space-y-6">
              <div>
                <label className="block text-lg text-gray-700 font-medium">Leave Type</label>
                <select className="w-full p-3 mt-2 border border-gray-300 rounded-xl">
                  <option>Sick Leave</option>
                  <option>Casual Leave</option>
                  <option>Paid Leave</option>
                </select>
              </div>
  
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-lg text-gray-700 font-medium">From</label>
                  <input type="date" className="w-full p-3 mt-2 border border-gray-300 rounded-xl" />
                </div>
                <div>
                  <label className="block text-lg text-gray-700 font-medium">To</label>
                  <input type="date" className="w-full p-3 mt-2 border border-gray-300 rounded-xl" />
                </div>
              </div>
  
              <div>
                <label className="block text-lg text-gray-700 font-medium">Reason</label>
                <textarea className="w-full p-3 mt-2 border border-gray-300 rounded-xl h-24"></textarea>
              </div>
  
              <button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 text-lg rounded-xl hover:from-purple-700 hover:to-indigo-700">
                Submit Leave Request
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  