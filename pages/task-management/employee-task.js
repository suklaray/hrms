import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Head from 'next/head';
import SideBar from "@/Components/SideBar";
import { ArrowLeft, Calendar, Clock, User, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { swalConfirm } from '@/utils/confirmDialog';

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
      case "Completed": return "bg-green-100 text-green-800";
      case "In Progress": return "bg-yellow-100 text-yellow-800";
      case "Pending": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High": return "bg-red-100 text-red-800";
      case "Medium": return "bg-yellow-100 text-yellow-800";
      case "Low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const toggleSelectTask = (taskId) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const selectAllTasks = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(tasks.map(task => task.id));
    }
  };

  const deleteSelectedTasks = async () => {
    if (selectedTasks.length === 0) return;
    const confirm = await swalConfirm(`Are you sure you want to delete ${selectedTasks.length} task(s)?`);
    if (!confirm) return;

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

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const formattedHours = hours.toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${formattedHours}:${minutes} ${ampm}`;
  };

  const getDeadlineStatus = (deadline, status) => {
    if (status === 'Completed') return null;
    const now = new Date();
    const dueDate = new Date(deadline);
    
    const diffTime = dueDate.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffTime < 0) {
      return { text: 'Overdue', color: 'text-red-600', bg: 'bg-red-50' };
    } else if (diffDays === 0) {
      if (diffHours < 2) {
        return { text: `Due in ${diffHours === 0 ? Math.max(1, diffMinutes) + ' minute(s)' : diffHours + ' hour(s)'}`, color: 'text-red-600', bg: 'bg-red-50' };
      }
      return { text: 'Due today', color: 'text-orange-600', bg: 'bg-orange-50' };
    } else if (diffDays === 1) {
      return { text: 'Due tomorrow', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    } else if (diffDays <= 3) {
      return { text: `${diffDays} days left`, color: 'text-yellow-600', bg: 'bg-yellow-50' };
    } else if (diffDays <= 7) {
      return { text: `${diffDays} days left`, color: 'text-blue-600', bg: 'bg-blue-50' };
    }
    return null;
  };

  return (
    <>
      <Head>
        <title>Employee Tasks - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 overflow-auto">
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

            {selectedTasks.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {selectedTasks.length} selected
                </span>
                <button
                  onClick={deleteSelectedTasks}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete ({selectedTasks.length})
                </button>
              </div>
            )}
          </div>

          <div className="p-6">
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      <input
                        type="checkbox"
                        checked={tasks.length > 0 && selectedTasks.length === tasks.length}
                        onChange={selectAllTasks}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded cursor-pointer"
                      />
                    </th>
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
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">
                            {formatDateTime(task.deadline)}
                          </div>
                          {(() => {
                            const deadlineStatus = getDeadlineStatus(task.deadline, task.status);
                            return deadlineStatus && (
                              <div className={`text-xs mt-1 px-2 py-1 rounded-full inline-block ${deadlineStatus.bg} ${deadlineStatus.color}`}>
                                {deadlineStatus.text}
                              </div>
                            );
                          })()} 
                        </td>
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