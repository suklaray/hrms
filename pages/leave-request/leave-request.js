import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from 'next/head';
import SideBar from "@/Components/SideBar";
import { Calendar, Clock, FileText, Plus, Eye, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { getUserFromToken } from "@/lib/getUserFromToken";
import prisma from "@/lib/prisma";

export async function getServerSideProps(context) {
  const { req } = context;
  const token = req?.cookies?.token || "";
  const user = getUserFromToken(token);

  if (!user || !["superadmin", "admin", "hr"].includes(user.role)) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  let userData = null;
  try {
    userData = await prisma.users.findUnique({
      where: { empid: user.empid || user.id },
      select: {
        empid: true,
        name: true,
        email: true,
        role: true
      }
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
  }

  return {
    props: {
      user: {
        empid: userData?.empid || user.empid,
        name: userData?.name || user.name,
        role: (userData?.role || user.role).toLowerCase(),
        email: userData?.email || user.email,
      },
    },
  };
}

export default function LeaveRequest({ user }) {
  const [activeTab, setActiveTab] = useState("apply");
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    from_date: "",
    to_date: "",
    reason: "",
    leave_type: "Sick Leave",
    attachment: ""
  });

  const leaveTypes = ["Sick Leave", "Casual Leave", "Annual Leave", "Emergency Leave", "Maternity Leave", "Paternity Leave"];

  useEffect(() => {
    if (activeTab === "history") {
      fetchLeaveRequests();
    }
  }, [activeTab]);

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/leave-records/leave-request", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setLeaveRequests(data.leaveRequests || []);
      } else {
        setMessage("Failed to fetch leave requests.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Failed to fetch leave requests.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/leave-records/leave-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Leave request submitted successfully!");
        setFormData({
          from_date: "",
          to_date: "",
          reason: "",
          leave_type: "Sick Leave",
          attachment: ""
        });
      } else {
        setMessage(data.message || "Failed to submit leave request.");
      }
    } catch (error) {
      setMessage("Error submitting leave request.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Approved": return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "Rejected": return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved": return "bg-green-100 text-green-800";
      case "Rejected": return "bg-red-100 text-red-800";
      default: return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <>
      <Head>
        <title>Leave Request - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 overflow-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Leave Request</h1>
                <p className="text-gray-600">Apply for leave and view your leave history</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab("apply")}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "apply"
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Apply Leave
                  </button>
                  <button
                    onClick={() => setActiveTab("history")}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "history"
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <FileText className="w-4 h-4 inline mr-2" />
                    Leave History
                  </button>
                </nav>
              </div>

              {/* Apply Leave Tab */}
              {activeTab === "apply" && (
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit Leave Request</h3>
                  
                  {message && (
                    <div className={`mb-4 p-4 rounded-lg flex items-center ${
                      message.includes('successfully') 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      {message.includes('successfully') ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                      )}
                      <p className={message.includes('successfully') ? 'text-green-700' : 'text-red-700'}>
                        {message}
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Leave Type *
                        </label>
                        <select
                          name="leave_type"
                          value={formData.leave_type}
                          onChange={handleChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {leaveTypes.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          From Date *
                        </label>
                        <input
                          type="date"
                          name="from_date"
                          value={formData.from_date}
                          onChange={handleChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          To Date *
                        </label>
                        <input
                          type="date"
                          name="to_date"
                          value={formData.to_date}
                          onChange={handleChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Attachment (Optional)
                        </label>
                        <input
                          type="text"
                          name="attachment"
                          value={formData.attachment}
                          onChange={handleChange}
                          placeholder="Attachment URL or description"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason *
                      </label>
                      <textarea
                        name="reason"
                        value={formData.reason}
                        onChange={handleChange}
                        required
                        rows={4}
                        placeholder="Please provide a reason for your leave request..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full md:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      {loading ? "Submitting..." : "Submit Leave Request"}
                    </button>
                  </form>
                </div>
              )}

              {/* Leave History Tab */}
              {activeTab === "history" && (
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave History</h3>
                  
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
                    </div>
                  ) : leaveRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Leave Requests</h3>
                      <p className="text-gray-500">You don&apos;t have any leave requests yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied Date</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {leaveRequests.map((request) => (
                            <tr key={request.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {request.leave_type}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(request.from_date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(request.to_date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                                {request.reason}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {getStatusIcon(request.status)}
                                  <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                                    {request.status}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(request.applied_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
