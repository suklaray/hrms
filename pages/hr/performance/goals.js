import { useState } from 'react';
import SideBar from "@/Components/SideBar";

export default function GoalSetting() {
  const [goals, setGoals] = useState([
    {
      empName: "John Doe",
      goal: "Improve communication skills",
      progress: 60,
      tasks: ["Attend workshop", "Weekly team meetings"],
      newTask: "",
    },
    {
      empName: "Jane Smith",
      goal: "Complete UI redesign",
      progress: 90,
      tasks: ["Design homepage", "Get feedback"],
      newTask: "",
    },
    {
      empName: "Mark Lee",
      goal: "Enhance backend security",
      progress: 45,
      tasks: ["Add input validation", "Audit APIs"],
      newTask: "",
    },
    {
      empName: "Ayesha Khan",
      goal: "Improve testing coverage",
      progress: 70,
      tasks: ["Write unit tests", "Setup CI pipeline"],
      newTask: "",
    },
    {
      empName: "Vikram Patel",
      goal: "Database optimization",
      progress: 50,
      tasks: ["Index audit", "Query tuning"],
      newTask: "",
    },
    {
      empName: "Sara Williams",
      goal: "Create marketing campaign",
      progress: 80,
      tasks: ["Draft content", "Design posters"],
      newTask: "",
    },
    {
      empName: "Daniel Costa",
      goal: "Cloud migration",
      progress: 40,
      tasks: ["Set up AWS", "Move DB to RDS"],
      newTask: "",
    },
    {
      empName: "Meena Roy",
      goal: "Improve customer support",
      progress: 65,
      tasks: ["Chatbot training", "Survey analysis"],
      newTask: "",
    },
    {
      empName: "Kevin Wright",
      goal: "Website speed improvement",
      progress: 55,
      tasks: ["Image optimization", "Minify JS/CSS"],
      newTask: "",
    },
    {
      empName: "Nisha Verma",
      goal: "SEO improvement",
      progress: 75,
      tasks: ["Add meta tags", "Update sitemap"],
      newTask: "",
    },
  ]);

  const handleTaskChange = (index, value) => {
    const updated = [...goals];
    updated[index].newTask = value;
    setGoals(updated);
  };

  const addTask = (index) => {
    const updated = [...goals];
    const task = updated[index].newTask.trim();
    if (task !== "") {
      updated[index].tasks.push(task);
      updated[index].newTask = "";
      setGoals(updated);
    }
  };

  return (
    <div className="flex">
      <SideBar />
      <div className="w-full p-6 bg-white min-h-screen">
        <h1 className="text-2xl font-bold text-indigo-700 mb-6 text-center">Employee Goals & Performance Tracking</h1>

        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border border-gray-300">
            <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white uppercase text-center">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Goal</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Tasks</th>
                <th className="px-4 py-3">Add Task</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((g, i) => (
                <tr
                  key={i}
                  className={`text-sm ${
                    i % 2 === 0 ? "bg-white" : "bg-indigo-50"
                  } hover:bg-indigo-100 transition`}
                >
                  <td className="px-4 py-3 font-medium text-center">{g.empName}</td>
                  <td className="px-4 py-3 text-center">{g.goal}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="w-full bg-gray-200 h-3 rounded-full">
                      <div
                        className="bg-indigo-600 h-3 rounded-full"
                        style={{ width: `${g.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{g.progress}%</p>
                  </td>
                  <td className="px-4 py-3 text-left">
                    <ul className="list-disc ml-5 space-y-1 text-gray-700">
                      {g.tasks.map((task, idx) => (
                        <li key={idx}>{task}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col md:flex-row items-center gap-2">
                      <input
                        type="text"
                        placeholder="New task"
                        className="border rounded px-2 py-1 w-full md:w-auto"
                        value={g.newTask}
                        onChange={(e) => handleTaskChange(i, e.target.value)}
                      />
                      <button
                        onClick={() => addTask(i)}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-1 rounded hover:from-indigo-700 hover:to-purple-700"
                      >
                        Add
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
