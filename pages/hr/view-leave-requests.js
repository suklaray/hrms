import { useEffect, useState } from "react";
import moment from "moment";
import Head from "next/head";
import SideBar from "@/Components/SideBar";
import { useRouter } from "next/router";
import {
  Eye,
  Calendar,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-toastify";
import { swalConfirm } from "@/utils/confirmDialog";

export default function ViewLeaveRequests() {
  const router = useRouter();
  const [allLeaveData, setAllLeaveData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [showLeaveTypeModal, setShowLeaveTypeModal] = useState(false);
  const [leaveTypeForm, setLeaveTypeForm] = useState({
    type_name: "",
    max_days: "",
    paid: true,
  });
  const [editingLeaveType, setEditingLeaveType] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("pending");
  const itemsPerPage = 10;

  useEffect(() => {
    // Fetching leave requests
    fetch("/api/hr/leave-requests")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAllLeaveData(data.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching leave requests:", err);
        setLoading(false);
      });

    // Fetch leave types
    fetchLeaveTypes();
  }, []);

  const fetchLeaveTypes = async () => {
    try {
      const res = await fetch("/api/hr/leave-types");
      const data = await res.json();
      if (data.success) {
        setLeaveTypes(data.data);
      }
    } catch (error) {
      console.error("Error fetching leave types:", error);
    }
  };

  const handleLogout = () => {
    router.push("/login");
  };

  const handleStatusChange = async (leaveId, newStatus) => {
    try {
      const res = await fetch("/api/hr/update-leave-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leaveId, status: newStatus }),
      });

      const data = await res.json();
      if (data.success) {
        // Refetch the data to get the latest status
        const refreshRes = await fetch("/api/hr/leave-requests");
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          setAllLeaveData(refreshData.data);
        }
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const formatDate = (dateString) => {
    return moment(dateString).isValid()
      ? moment(dateString).format("DD/MM/YYYY")
      : "Invalid Date";
  };

  const getLeaveStatus = (leave) => {
    const today = moment();
    const startDate = moment(leave.from_date);
    const endDate = moment(leave.to_date);

    if (
      leave.status === "Approved" &&
      today.isBetween(startDate, endDate, "day", "[]")
    ) {
      return "On Leave";
    }
    return leave.status;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "Rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "On Leave":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const handleViewEmployee = (empid) => {
    if (activeTab === "history") {
      router.push(`/hr/employee-leave-summary/${empid}`);
    } else {
      router.push(`/hr/employee-leave-details/${empid}`);
    }
  };

  const handleLeaveTypeSubmit = async (e) => {
    e.preventDefault();
    try {
      const method = editingLeaveType ? "PUT" : "POST";
      const body = editingLeaveType
        ? { ...leaveTypeForm, id: editingLeaveType.id }
        : leaveTypeForm;

      const res = await fetch("/api/hr/leave-types", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        fetchLeaveTypes();
        setShowLeaveTypeModal(false);
        setLeaveTypeForm({ type_name: "", max_days: "", paid: true });
        setEditingLeaveType(null);
        toast.success(
          editingLeaveType
            ? "Leave type updated successfully"
            : "Leave type added successfully"
        );
      } else {
        toast.error(data.message || "Error saving leave type");
      }
    } catch (error) {
      toast.error("Error saving leave type");
    }
  };

  const handleEditLeaveType = (leaveType) => {
    setEditingLeaveType(leaveType);
    setLeaveTypeForm({
      type_name: leaveType.type_name,
      max_days: leaveType.max_days.toString(),
      paid: leaveType.paid,
    });
    setShowLeaveTypeModal(true);
  };

  // Delete Leave type
  const handleDeleteLeaveType = async (leaveType) => {
    if (await swalConfirm("Are you sure you want to delete this leave type?")) {
      try {
        const res = await fetch("/api/hr/leave-types", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: leaveType.id }),
        });

        const data = await res.json();
        if (data.success) {
          fetchLeaveTypes();
          toast.success("Leave type deleted successfully");
        } else {
          toast.error(data.message || "Error deleting leave type");
        }
      } catch (error) {
        toast.error("Error deleting leave type");
      }
    }
  };

  // Filter data based on active tab
  const getFilteredData = () => {
    if (activeTab === "pending") {
      console.log(
        "All leave data:",
        allLeaveData.map((l) => ({
          id: l.id,
          empid: l.empid,
          status: l.status,
        }))
      );
      const pendingLeaves = allLeaveData.filter(
        (leave) => leave.status === "Pending"
      );
      console.log(
        "Pending leaves:",
        pendingLeaves.map((l) => ({
          id: l.id,
          empid: l.empid,
          status: l.status,
        }))
      );
      const groupedData = pendingLeaves.reduce((acc, leave) => {
        if (
          !acc[leave.empid] ||
          new Date(leave.created_at) > new Date(acc[leave.empid].created_at)
        ) {
          acc[leave.empid] = leave;
        }
        return acc;
      }, {});
      return Object.values(groupedData);
    }
    return allLeaveData;
  };

  const filteredData = getFilteredData();

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-indigo-200 via-white to-purple-200">
        <SideBar handleLogout={handleLogout} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-indigo-700 text-xl font-semibold">
            Loading leave requests...
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Leave Requests Management - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar handleLogout={handleLogout} />
        <div className="flex-1 overflow-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Leave Requests Management
            </h1>
            <p className="text-gray-600">
              Manage employee leave requests and track leave status
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Leave Types Management */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Leave Types Management
                  </h2>
                  <p className="text-sm text-gray-600">
                    Configure available leave types for employees
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingLeaveType(null);
                    setLeaveTypeForm({
                      type_name: "",
                      max_days: "",
                      paid: true,
                    });
                    setShowLeaveTypeModal(true);
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Leave Type</span>
                </button>
              </div>

              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Leave Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Max Days
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {leaveTypes.map((type) => (
                        <tr key={type.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {type.type_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {type.max_days}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {type.paid ? "Paid" : "Unpaid"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleEditLeaveType(type)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteLeaveType(type)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              <Trash2 className="w-4 h-4 text-red-600 hover:text-red-900" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {leaveTypes.length === 0 && (
                        <tr>
                          <td
                            colSpan="4"
                            className="px-6 py-12 text-center text-gray-500"
                          >
                            <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p>No leave types configured</p>
                            <p className="text-sm">
                              Add leave types for employees to request
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Leave Requests List with Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Employee Leave Requests
                </h2>

                {/* Tabs */}
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => {
                      setActiveTab("pending");
                      setCurrentPage(1);
                      // Refresh data when switching to pending tab
                      fetch("/api/hr/leave-requests")
                        .then((res) => res.json())
                        .then((data) => {
                          if (data.success) {
                            setAllLeaveData(data.data);
                          }
                        });
                    }}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === "pending"
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Pending Requests
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("history");
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === "history"
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    All Leave History
                  </button>
                </div>

                {filteredData.length > 0 &&
                  (() => {
                    const totalPages = Math.ceil(
                      filteredData.length / itemsPerPage
                    );
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const paginatedData = filteredData.slice(
                      startIndex,
                      startIndex + itemsPerPage
                    );

                    return (
                      <p className="text-sm text-gray-600 mt-4">
                        Showing {paginatedData.length} of {filteredData.length}{" "}
                        {activeTab === "pending"
                          ? "pending requests"
                          : "leave records"}
                        {totalPages > 1 && (
                          <span>
                            {" "}
                            (Page {currentPage} of {totalPages})
                          </span>
                        )}
                      </p>
                    );
                  })()}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Leave Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      if (filteredData.length === 0) return null;

                      const totalPages = Math.ceil(
                        filteredData.length / itemsPerPage
                      );
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const paginatedData = filteredData.slice(
                        startIndex,
                        startIndex + itemsPerPage
                      );

                      return paginatedData.map((leave) => {
                        const currentStatus = getLeaveStatus(leave);
                        return (
                          <tr key={leave.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                  <User className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {leave.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    ID: {leave.empid}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Email: {leave.users?.email || "N/A"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 font-medium">
                                {leave.leave_type}
                              </div>
                              <div className="text-sm text-gray-500">
                                {leave.reason}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center text-sm text-gray-900">
                                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                <div>
                                  <div>{formatDate(leave.from_date)}</div>
                                  <div className="text-gray-500">
                                    to {formatDate(leave.to_date)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                  currentStatus
                                )}`}
                              >
                                {currentStatus === "Approved" && (
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                )}
                                {currentStatus === "Rejected" && (
                                  <XCircle className="w-3 h-3 mr-1" />
                                )}
                                {currentStatus === "Pending" && (
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                )}
                                {currentStatus === "On Leave" && (
                                  <Clock className="w-3 h-3 mr-1" />
                                )}
                                {currentStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => handleViewEmployee(leave.empid)}
                                className="p-2 text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                    {filteredData.length === 0 && (
                      <tr>
                        <td
                          colSpan="5"
                          className="px-6 py-12 text-center text-gray-500"
                        >
                          <div className="flex flex-col items-center">
                            <Calendar className="w-12 h-12 text-gray-300 mb-4" />
                            <p>
                              No{" "}
                              {activeTab === "pending"
                                ? "pending requests"
                                : "leave records"}{" "}
                              found
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {(() => {
                const totalPages = Math.ceil(
                  filteredData.length / itemsPerPage
                );

                const handlePageChange = (page) => {
                  setCurrentPage(page);
                };

                return totalPages > 1 ? (
                  <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing page {currentPage} of {totalPages} (
                      {filteredData.length} total{" "}
                      {activeTab === "pending" ? "requests" : "records"})
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === 1
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              page === currentPage
                                ? "bg-indigo-600 text-white"
                                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {page}
                          </button>
                        )
                      )}

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === totalPages
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </div>

          {/* Leave Type Modal */}
          {showLeaveTypeModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">
                    {editingLeaveType
                      ? "Edit Leave Type"
                      : "Add New Leave Type"}
                  </h3>
                  <button
                    onClick={() => {
                      setShowLeaveTypeModal(false);
                      setEditingLeaveType(null);
                      setLeaveTypeForm({
                        type_name: "",
                        max_days: "",
                        paid: true,
                      });
                    }}
                    className="text-gray-400 hover:text-gray-600 text-xl"
                  >
                    ×
                  </button>
                </div>
                <form onSubmit={handleLeaveTypeSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Leave Type Name
                    </label>
                    <input
                      type="text"
                      value={leaveTypeForm.type_name}
                      onChange={(e) =>
                        setLeaveTypeForm({
                          ...leaveTypeForm,
                          type_name: e.target.value,
                        })
                      }
                      placeholder="e.g., Sick Leave"
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Days
                    </label>
                    <input
                      type="number"
                      value={leaveTypeForm.max_days}
                      onChange={(e) =>
                        setLeaveTypeForm({
                          ...leaveTypeForm,
                          max_days: e.target.value,
                        })
                      }
                      placeholder="e.g., 12"
                      min="1"
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={leaveTypeForm.paid}
                        onChange={(e) =>
                          setLeaveTypeForm({
                            ...leaveTypeForm,
                            paid: e.target.checked,
                          })
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Paid Leave
                      </span>
                    </label>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLeaveTypeModal(false);
                        setEditingLeaveType(null);
                        setLeaveTypeForm({
                          type_name: "",
                          max_days: "",
                          paid: true,
                        });
                      }}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {editingLeaveType ? "Update" : "Add"} Leave Type
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
