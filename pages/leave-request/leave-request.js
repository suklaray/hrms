import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import Head from 'next/head';
import SideBar from "@/Components/SideBar";
import { Calendar, Clock, FileText, Plus, Eye, AlertCircle, CheckCircle, XCircle, X } from "lucide-react";
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
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [dayCount, setDayCount] = useState(0);
  const [formData, setFormData] = useState({
    from_date: "",
    to_date: "",
    reason: "",
    leave_type: "Sick Leave",
    attachment: ""
  });
  const [selectedReason, setSelectedReason] = useState(null);
  const [errors, setErrors] = useState({});
const fileInputRef = useRef(null);



  useEffect(() => {
    fetchLeaveTypes();
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

  const validateForm = () => {
    const newErrors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Date validations
    if (!formData.from_date) {
      newErrors.from_date = "From date is required";
    } else {
      const fromDate = new Date(formData.from_date);
      if (fromDate < today) {
        newErrors.from_date = "From date cannot be in the past";
      }
    }
    
    if (!formData.to_date) {
      newErrors.to_date = "To date is required";
    } else if (formData.from_date) {
      const fromDate = new Date(formData.from_date);
      const toDate = new Date(formData.to_date);
      if (toDate < fromDate) {
        newErrors.to_date = "To date must be after from date";
      }
    }
    
    // Reason validation
    if (!formData.reason.trim()) {
      newErrors.reason = "Reason is required";
    } else if (formData.reason.trim().length < 10) {
      newErrors.reason = "Reason must be at least 10 characters";
    } else if (formData.reason.trim().length > 500) {
      newErrors.reason = "Reason cannot exceed 500 characters";
    }
    
    // File validation
    if (formData.attachment && typeof formData.attachment === 'object') {
      const file = formData.attachment;
      const maxSize = 5 * 1024 * 1024; // 5MB
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png'];
      
      if (file.size > maxSize) {
        newErrors.attachment = "File size cannot exceed 5MB";
      }
      
      if (!allowedTypes.includes(file.type)) {
        newErrors.attachment = "Only PDF, DOC, DOCX, JPG, JPEG, PNG files are allowed";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) {
    setMessage("Please fix the errors below");
    return;
  }
  
  setLoading(true);
  setMessage("");
  setErrors({});

  try {
    let attachmentData = "";
    
    // Convert file to base64 if attachment exists
    if (formData.attachment && typeof formData.attachment === 'object') {
      const reader = new FileReader();
      attachmentData = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(formData.attachment);
      });
    } else {
      attachmentData = formData.attachment || "";
    }

    const response = await fetch("/api/leave-records/leave-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from_date: formData.from_date,
        to_date: formData.to_date,
        reason: formData.reason,
        leave_type: formData.leave_type,
        attachment: attachmentData
      }),
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
      if (fileInputRef.current) {
    fileInputRef.current.value = "";
  }
    } else {
      setMessage(data.message || "Failed to submit leave request.");
    }
  } catch (error) {
    setMessage("Error submitting leave request.");
  } finally {
    setLoading(false);
  }
};



  const fetchLeaveTypes = async () => {
    try {
      const response = await fetch("/api/leave/types", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setLeaveTypes(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch leave types:", error);
    }
  };

  const calculateDays = useCallback(() => {
    if (formData.from_date && formData.to_date) {
      const fromDate = new Date(formData.from_date);
      const toDate = new Date(formData.to_date);
      
      if (toDate >= fromDate) {
        const days = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
        setDayCount(days);
      } else {
        setDayCount(0);
      }
    } else {
      setDayCount(0);
    }
  }, [formData.from_date, formData.to_date]);

  
  useEffect(() => {
    calculateDays();
  }, [calculateDays]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
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
            {/* Leave Types Table */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-8">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Leave Types</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {leaveTypes.map((type, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {type.type_name?.replace(/_/g, ' ')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {type.max_days || 0}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {type.max_days || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {leaveTypes.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No leave types found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-6">
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
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        >
                          {leaveTypes.map((type) => (
                            <option key={type.id} value={type.type_name.replace(/_/g, ' ')}>
                              {type.type_name.replace(/_/g, ' ')}
                            </option>
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
                          min={new Date().toISOString().split('T')[0]}
                          required
                          className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                            errors.from_date ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                        />
                        {errors.from_date && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {errors.from_date}
                          </p>
                        )}
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
                          min={formData.from_date || new Date().toISOString().split('T')[0]}
                          className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                            errors.to_date ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                        />
                        {errors.to_date && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {errors.to_date}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Attachment (Optional)
                        </label>
                        <input
  type="file"
  name="attachment"
  ref={fileInputRef}
  onChange={(e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, attachment: file });
      if (errors.attachment) {
        setErrors({ ...errors, attachment: "" });
      }
    }
  }}
  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
  className={`w-full px-4 py-3 border rounded-xl ${
    errors.attachment ? 'border-red-300 bg-red-50' : 'border-gray-300'
  }`}
/>
                        <p className="mt-1 text-xs text-gray-500">Max file size: 5MB. Allowed: PDF, DOC, DOCX, JPG, PNG</p>
                        {errors.attachment && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {errors.attachment}
                          </p>
                        )}
                        {formData.attachment && (
                          <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">Selected: {formData.attachment.name}</p>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Date Count Display */}
                    {(formData.from_date && formData.to_date) && (
                      <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Calendar className="w-5 h-5 text-indigo-600 mr-2" />
                            <span className="text-sm font-medium text-indigo-900">Leave Duration:</span>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-bold text-indigo-600">{dayCount}</span>
                            <span className="text-sm text-indigo-700 ml-1">{dayCount === 1 ? 'day' : 'days'}</span>
                          </div>
                        </div>
                        {dayCount > 0 && (
                          <p className="text-xs text-indigo-600 mt-2">
                            From {new Date(formData.from_date).toLocaleDateString()} to {new Date(formData.to_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}

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
                        maxLength={500}
                        placeholder="Please provide a reason for your leave request (minimum 10 characters)..."
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                          errors.reason ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      />
                      <div className="flex justify-between mt-1">
                        <div>
                          {errors.reason && (
                            <p className="text-sm text-red-600 flex items-center">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              {errors.reason}
                            </p>
                          )}
                        </div>
                        <p className={`text-xs ${
                          formData.reason.length > 450 ? 'text-red-500' : 'text-gray-500'
                        }`}>
                          {formData.reason.length}/500 characters
                        </p>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attachment</th>

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
                              <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
  <div 
    className="truncate cursor-pointer hover:text-indigo-600" 
    onClick={() => setSelectedReason(request.reason)}
  >
    {request.reason}
  </div>
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {request.attachment ? (
                                  <button
                                    onClick={() => {
                                      try {
                                        const byteCharacters = atob(request.attachment.split(',')[1]);
                                        const byteNumbers = new Array(byteCharacters.length);
                                        for (let i = 0; i < byteCharacters.length; i++) {
                                          byteNumbers[i] = byteCharacters.charCodeAt(i);
                                        }
                                        const byteArray = new Uint8Array(byteNumbers);
                                        const mimeType = request.attachment.split(',')[0].split(':')[1].split(';')[0];
                                        const blob = new Blob([byteArray], { type: mimeType });
                                        const url = URL.createObjectURL(blob);
                                        window.open(url, '_blank');
                                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                                      } catch (error) {
                                        console.error('Error opening attachment:', error);
                                        alert('Unable to open attachment');
                                      }
                                    }}
                                    className="flex items-center text-indigo-600 hover:text-indigo-800"
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                  </button>
                                ) : (
                                  <span className="text-gray-400">No attachment</span>
                                )}
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
        {selectedReason && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 relative">
              <button 
                onClick={() => setSelectedReason(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
              <h3 className="text-lg font-semibold mb-4 pr-8">Leave Reason</h3>
              <p className="text-gray-700">{selectedReason}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
