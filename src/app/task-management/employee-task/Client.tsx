"use client";

import { Suspense } from "react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "@/lib/compatRouter";
import Head from "@/lib/compatHead";
import { ArrowLeft, Trash2, Pencil, X, Save } from "lucide-react";
import Link from "next/link";
import { swalConfirm } from '@/utils/confirmDialog';
import { formatDateTime } from '@/utils/dateTime';


function EmployeeTasks({ canDelete, canEdit, canUpdateStatus }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", deadline: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const router = useRouter();
  const { employeeId } = router.query;

  const toDateTimeInputValue = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const indiaDate = new Date(date.getTime() + 330 * 60_000);
    return indiaDate.toISOString().slice(0, 16);
  };

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
      } else if (response.status === 403) {
        alert('You do not have permission to delete tasks.');
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

  const startEditingTask = (task) => {
    setEditingTask(task);
    setEditForm({
      title: task.title || "",
      description: task.description || "",
      deadline: toDateTimeInputValue(task.deadline),
    });
    setEditError("");
  };

  const saveTaskEdits = async (event) => {
    event.preventDefault();
    if (!editingTask || !canEdit) return;

    setSavingEdit(true);
    setEditError("");
    try {
      const response = await fetch("/api/task-management/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ taskId: editingTask.id, ...editForm }),
      });
      const data = await response.json();
      if (!response.ok) {
        setEditError(data.error || "Failed to update task.");
        return;
      }
      setTasks((previousTasks) =>
        previousTasks.map((task) => task.id === editingTask.id ? { ...task, ...data.task } : task)
      );
      setEditingTask(null);
    } catch (error) {
      console.error("Error updating task:", error);
      setEditError("An error occurred while updating the task.");
    } finally {
      setSavingEdit(false);
    }
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

            {canDelete && selectedTasks.length > 0 && (
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
                    {canDelete && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      <input
                        type="checkbox"
                        checked={tasks.length > 0 && selectedTasks.length === tasks.length}
                        onChange={selectAllTasks}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded cursor-pointer"
                      />
                    </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deadline</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned By</th>
                    {canEdit && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6 + Number(canDelete) + Number(canEdit)} className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mx-auto"></div>
                      </td>
                    </tr>
                  ) : tasks.length === 0 ? (
                    <tr>
                      <td colSpan={6 + Number(canDelete) + Number(canEdit)} className="text-center py-8 text-gray-500">
                        No tasks assigned
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        {canDelete && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedTasks.includes(task.id)}
                            onChange={() => toggleSelectTask(task.id)}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded cursor-pointer"
                          />
                        </td>
                        )}
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{task.title}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-pre-wrap">{task.description || "—"}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {canUpdateStatus ? (
                            <select
                              value={task.status}
                              onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                              className={`px-2 py-1 text-xs font-medium rounded-full cursor-pointer ${getStatusColor(task.status)}`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                          )}
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
                        <td className="px-4 py-3 text-sm text-gray-500">{task.creator?.name}</td>
                        {canEdit && (
                          <td className="px-4 py-3 text-sm">
                            <button
                              type="button"
                              onClick={() => startEditingTask(task)}
                              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-3 py-2 text-indigo-700 hover:bg-indigo-50"
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveTaskEdits} className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Edit Task</h2>
              <button type="button" onClick={() => setEditingTask(null)} aria-label="Close edit form">
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="block text-sm font-medium text-gray-700">
              Title
              <input
                required
                minLength={3}
                value={editForm.title}
                onChange={(event) => setEditForm({ ...editForm, title: event.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Description
              <textarea
                maxLength={500}
                rows={4}
                value={editForm.description}
                onChange={(event) => setEditForm({ ...editForm, description: event.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Deadline
              <input
                required
                type="datetime-local"
                value={editForm.deadline}
                onChange={(event) => setEditForm({ ...editForm, deadline: event.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            {editError && <p role="alert" className="text-sm text-red-600">{editError}</p>}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {savingEdit ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export default function ClientPageWrapper(props: any) {
  return (
    <Suspense fallback={null}>
      <EmployeeTasks {...props} />
    </Suspense>
  );
}
