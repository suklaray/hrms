import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Head from 'next/head';
import SideBar from "@/Components/SideBar";
import { ArrowLeft, Calendar, Clock, User, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function EmployeeTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const router = useRouter();
  const { employeeId } = router.query;

  const fetchEmployeeTasks = useCallback(async () => {
    if (!employeeId) return;
    try {
      const response = await fetch(`/api/task-management/employee-tasks?employeeId=${employeeId}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Error fetching employee tasks:", error);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchEmployeeTasks();
  }, [fetchEmployeeTasks]);

  const getStatusColor = (status) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-yellow-100 text-yellow-800";
      case "pending": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const isOverdue = (deadline) => new Date(deadline) < new Date();

  // Select / Deselect tasks
  const toggleSelectTask = (taskId) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  // Delete selected tasks
  const deleteSelectedTasks = async () => {
    if (selectedTasks.length === 0) return;

    try {
      const response = await fetch(`/api/task-management/delete-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: selectedTasks }),
        credentials: "include",
      });
      if (response.ok) {
        setTasks(prevTasks => prevTasks.filter(task => !selectedTasks.includes(task.id)));
        setSelectedTasks([]);
      }
    } catch (error) {
      console.error("Error deleting tasks:", error);
    }
  };

  // Update status in DB
  const updateTaskStatus = async (taskId, status) => {
    try {
      const response = await fetch(`/api/task-management/update-task-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status }),
        credentials: "include",
      });
      if (response.ok) {
        setTasks(prevTasks => prevTasks.map(task => 
          task.id === taskId ? { ...task, status } : task
        ));
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  return (
    <>
      <Head>
        <title>Employee Tasks - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 overflow-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Link
                href="/task-management/manage-tasks"
                className="inline-flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Employee Tasks</h1>
                <p className="text-gray-600">Employee ID: {employeeId}</p>
              </div>
            </div>

            <button
              onClick={deleteSelectedTasks}
              disabled={selectedTasks.length === 0}
              className={`inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors ${
                selectedTasks.length === 0 ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </button>
          </div>

          {/* Task List */}
          <div className="p-6">
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Select</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deadline</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mx-auto"></div>
                      </td>
                    </tr>
                  ) : tasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        No tasks assigned
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedTasks.includes(task.id)}
                            onChange={() => toggleSelectTask(task.id)}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{task.title}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <select
                            value={task.status}
                            onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                            className={`px-2 py-1 text-xs font-medium rounded-full cursor-pointer ${getStatusColor(task.status)}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{new Date(task.deadline).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{task.creator_name}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
