import { useState } from 'react';
import SideBar from "@/Components/SideBar";
import { FaEye } from 'react-icons/fa';

export default function Compliance() {
  const [employees, setEmployees] = useState([
  { empid: 'EMP1001', name: 'John Doe', department: 'HR', role: 'Full-time', status: 'Compliant', pf: 1200, esi: 800, gratuity: 5000, tds: 1500, leave: 15, workingHours: 45 },
  { empid: 'EMP1002', name: 'Aisha Khan', department: 'Finance', role: 'Full-time', status: 'Expiring Soon', pf: 1100, esi: 700, gratuity: 4500, tds: 1400, leave: 10, workingHours: 42 },
  { empid: 'EMP1003', name: 'Sanjay Patel', department: 'IT', role: 'Full-time', status: 'Non-compliant', pf: 900, esi: 600, gratuity: 3000, tds: 1200, leave: 5, workingHours: 50 },
  { empid: 'EMP1004', name: 'Alice Smith', department: 'Marketing', role: 'Intern', status: 'Compliant', pf: 1100, esi: 750, gratuity: 4600, tds: 1450, leave: 12, workingHours: 44 },
  { empid: 'EMP1005', name: 'Bob Lee', department: 'Design', role: 'Intern', status: 'Expiring Soon', pf: 850, esi: 650, gratuity: 3300, tds: 1000, leave: 8, workingHours: 38 },
  { empid: 'EMP1006', name: 'Emma Clark', department: 'Engineering', role: 'Intern', status: 'Non-compliant', pf: 950, esi: 670, gratuity: 3500, tds: 1100, leave: 6, workingHours: 48 },
]);


  const [filterStatus, setFilterStatus] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const handleViewDetails = (empid) => {
    const emp = employees.find((e) => e.empid === empid);
    setSelectedEmployee(emp);
  };

  const filteredEmployees = filterStatus
    ? employees.filter(emp => emp.status === filterStatus)
    : employees;

  const handleShowAll = () => {
    setFilterStatus(null); 
  };

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      <SideBar />
      <div className="flex-1 p-6">
        <h1 className="text-3xl font-bold mb-6 text-center text-indigo-700">Statutory Compliance</h1>

        {/* Button to show all employees */}
        <div className="mb-6 flex justify-center">
          <button
            onClick={handleShowAll}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200"
          >
            Show All Employees
          </button>
        </div>

        {/* Status Section */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 bg-white shadow-lg rounded-lg text-center">
            <h2 className="text-xl font-bold text-gray-700">Compliance Status</h2>
           <p className="text-sm text-gray-500">PF/ESI/Gratuity</p>
            <button
              className="mt-4 px-6 py-2 bg-green-300 text-gray rounded-lg hover:bg-green-600 transition duration-200"
              onClick={() => setFilterStatus('Compliant')}
            >
              View
            </button>
          </div>
          <div className="p-6 bg-white shadow-lg rounded-lg text-center">
            <h2 className="text-xl font-bold text-gray-700">Expiring Soon</h2>
            <p className="text-sm text-gray-500">PF/ESI/Gratuity</p>
            <button
              className="mt-4 px-6 py-2 bg-yellow-200 text-gray rounded-lg hover:bg-yellow-600 transition duration-200"
              onClick={() => setFilterStatus('Expiring Soon')}
            >
              View
            </button>
          </div>
          <div className="p-6 bg-white shadow-lg rounded-lg text-center">
            <h2 className="text-xl font-bold text-gray-700">Non-compliant</h2>
            <p className="text-sm text-gray-500">PF/ESI/Gratuity</p>
            <button
              className="mt-4 px-6 py-2 bg-red-300 text-gray rounded-lg hover:bg-red-600 transition duration-200"
              onClick={() => setFilterStatus('Non-compliant')}
            >
              View
            </button>
          </div>
        </div>

        {/* Statutory Compliance Metrics */}
        <div className="overflow-x-auto bg-white shadow rounded-xl mb-6">
          <table className="min-w-full divide-y divide-gray-200 text-center">
            <thead className="bg-gray-100 text-sm text-gray-700">
              <tr>
                <th className="px-4 py-3">Employee ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">PF</th>
                <th className="px-4 py-3">ESI</th>
                <th className="px-4 py-3">Gratuity</th>
                <th className="px-4 py-3">TDS</th>
                <th className="px-4 py-3">Leave Balance</th>
                <th className="px-4 py-3">Working Hours</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">View</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map(emp => (
                <tr key={emp.empid} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewDetails(emp.empid)}>
                  <td className="px-4 py-3">{emp.empid}</td>
                  <td className="px-4 py-3">{emp.name}</td>
                  <td className="px-4 py-3">{emp.department}</td>
                  <td className="px-4 py-3">{emp.role}</td>
                  <td className="px-4 py-3">{emp.pf}</td>
                  <td className="px-4 py-3">{emp.esi}</td>
                  <td className="px-4 py-3">{emp.gratuity}</td>
                  <td className="px-4 py-3">{emp.tds}</td>
                  <td className="px-4 py-3">{emp.leave}</td>
                  <td className="px-4 py-3">{emp.workingHours}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full ${emp.status === 'Compliant' ? 'bg-green-300 text-gray' : emp.status === 'Expiring Soon' ? 'bg-yellow-100 text-gray-900' : 'bg-red-200 text-gray'}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-indigo-600 cursor-pointer">
                    <FaEye/>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal for Employee Details */}
        {selectedEmployee && (
          <div className="fixed inset-0 flex items-center justify-center bg-gray-600 bg-opacity-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
              <h2 className="text-2xl font-bold text-indigo-700">{selectedEmployee.name}&apos;s Compliance Details</h2>
              <div className="mt-4">
                <p><strong>Employee ID:</strong> {selectedEmployee.empid}</p>
                <p><strong>Department:</strong> {selectedEmployee.department}</p>
                <p><strong>Status:</strong> {selectedEmployee.status}</p>
                <p><strong>PF:</strong> {selectedEmployee.pf}</p>
                <p><strong>ESI:</strong> {selectedEmployee.esi}</p>
                <p><strong>Gratuity:</strong> {selectedEmployee.gratuity}</p>
                <p><strong>TDS:</strong> {selectedEmployee.tds}</p>
                <p><strong>Leave Balance:</strong> {selectedEmployee.leave}</p>
                <p><strong>Working Hours:</strong> {selectedEmployee.workingHours}</p>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
