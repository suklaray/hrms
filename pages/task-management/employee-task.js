import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Head from 'next/head';
import SideBar from "@/Components/SideBar";
import { ArrowLeft, Calendar, Clock, User, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function EmployeeTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);
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

  // Include fetchEmployeeTasks in dependency array
  useEffect(() => {
    fetchEmployeeTasks();
  }, [fetchEmployeeTasks]);


  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      default: return "bg-yellow-100 text-yellow-800";
    }
  };

  const isOverdue = (deadline) => {
    return new Date(deadline) < new Date();
  };

  return (
    <>
      <Head>
        <title>Employee Tasks - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 overflow-auto">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  href="/task-management/task-management"
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
            </div>
          </div>

          <div className="p-6">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Assigned Tasks</h3>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks Assigned</h3>
                    <p className="text-gray-500">This employee has no tasks assigned yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tasks.map((task) => (
                      <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="text-lg font-medium text-gray-900">{task.title}</h4>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                                {task.status}
                              </span>
                              {isOverdue(task.deadline) && task.status !== "completed" && (
                                <span className="flex items-center text-red-600 text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Overdue
                                </span>
                              )}
                            </div>
                            
                            {task.description && (
                              <p className="text-gray-600 mb-3">{task.description}</p>
                            )}
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                Deadline: {new Date(task.deadline).toLocaleString()}
                              </div>
                              <div className="flex items-center">
                                <User className="w-4 h-4 mr-1" />
                                Assigned by: {task.creator_name}
                              </div>
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                Created: {new Date(task.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
