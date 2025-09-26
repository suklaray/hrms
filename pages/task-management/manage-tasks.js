import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from 'next/head';
import SideBar from "@/Components/SideBar";
import { Plus, Users, Eye, Calendar, CheckCircle, AlertTriangle } from "lucide-react";
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

export default function TaskManagement({ user }) {
  const [activeTab, setActiveTab] = useState("assign");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigned_to: "",
    deadline: "",
    priority: "Medium"
  });

  const router = useRouter();
  const priorities = ["Low", "Medium", "High"];

  const filteredEmployees = searchTerm.trim() === '' 
  ? employees // Show all active employees when empty
  : employees.filter(emp => 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.empid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const isFormValid = formData.title.trim().length >= 3 && 
                     selectedEmployee && 
                     formData.deadline && 
                     formData.priority;

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/task-management/tasks", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/task-management/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Task assigned successfully!");
        setFormData({
          title: "",
          description: "",
          assigned_to: "",
          deadline: "",
          priority: "Medium"
        });
        setSelectedEmployee(null);
        setSearchTerm("");
      } else {
        setMessage(data.error || "Failed to assign task.");
      }
    } catch (error) {
      setMessage("Error assigning task.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleViewTasks = (empid) => {
    router.push(`/task-management/employee-task?employeeId=${empid}`);
  };

  return (
    <>
      <Head>
        <title>Task Management - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 overflow-auto">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
                <p className="text-gray-600">Assign and manage tasks for your team</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab("assign")}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "assign"
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Assign Task
                  </button>
                  <button
                    onClick={() => setActiveTab("employees")}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "employees"
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Users className="w-4 h-4 inline mr-2" />
                    Employee Tasks
                  </button>
                </nav>
              </div>

              {activeTab === "assign" && (
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign New Task</h3>
                  
                  {message && (
                    <div className={`mb-4 p-4 rounded-lg flex items-center ${
                      message.includes('successfully') 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      {message.includes('successfully') ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
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
                          Task Title * (min 3 characters)
                        </label>
                        <input
                          type="text"
                          name="title"
                          value={formData.title}
                          onChange={handleChange}
                          minLength={3}
                          required
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            formData.title.length > 0 && formData.title.length < 3 
                              ? 'border-red-300' 
                              : 'border-gray-300'
                          }`}
                          placeholder="Enter task title"
                        />
                        {formData.title.length > 0 && formData.title.length < 3 && (
                          <p className="text-red-500 text-xs mt-1">Title must be at least 3 characters</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Assign To *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                              setSearchTerm(e.target.value);
                              setShowDropdown(e.target.value.trim() !== "");
                            }}
                            placeholder="Search by name, email or ID..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          
                          {showDropdown && filteredEmployees.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {filteredEmployees.map((emp) => (
                              <div
                                key={emp.empid}
                                onClick={() => {
                                  setSelectedEmployee(emp);
                                  setSearchTerm(`${emp.name} (${emp.empid})`);
                                  setFormData({ ...formData, assigned_to: emp.empid });
                                  setShowDropdown(false);
                                }}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium text-gray-900">{emp.name}</div>
                                <div className="text-sm text-gray-500">
                                  {emp.email} • {emp.empid} • {emp.role}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                          
                          {selectedEmployee && (
                            <div className="mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                              <span className="text-sm text-indigo-700">
                                Selected: {selectedEmployee.name} ({selectedEmployee.empid})
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedEmployee(null);
                                  setSearchTerm("");
                                  setFormData({ ...formData, assigned_to: "" });
                                }}
                                className="text-indigo-600 hover:text-indigo-800"
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Deadline *
                        </label>
                        <input
                          type="datetime-local"
                          name="deadline"
                          value={formData.deadline}
                          onChange={handleChange}
                          min={new Date().toISOString().slice(0, 16)}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Priority
                        </label>
                        <select
                          name="priority"
                          value={formData.priority}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {priorities.map((priority) => (
                            <option key={priority} value={priority}>{priority}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Enter task description..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !isFormValid}
                      className={`w-full md:w-auto px-6 py-2 font-medium rounded-lg transition-colors ${
                        isFormValid && !loading
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {loading ? "Assigning..." : "Assign Task"}
                    </button>
                  </form>
                </div>
              )}

              {activeTab === "employees" && (
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Task List</h3>
                  
                  {employees.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Employees Found</h3>
                      <p className="text-gray-500">No employees available to assign tasks.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {employees.map((employee) => (
                            <tr key={employee.empid} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {employee.empid}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {employee.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {employee.email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                                  {employee.role}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button
                                  onClick={() => handleViewTasks(employee.empid)}
                                  className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View Tasks
                                </button>
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
