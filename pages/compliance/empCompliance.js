// pages/compliance.js
import { useState } from 'react';
import SideBar from "@/Components/SideBar";
import { Eye } from 'lucide-react';

export default function ComplianceDashboard() {
  const [filter, setFilter] = useState('All');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Hard‑coded
  const employees = [
    { id: 1,  empid: 'EMP1001', name: 'JYOSRI MONDAL',    department: 'HR',       status: 'Compliant',      lastUpdated: '2025‑05‑28', documents: [ { type: 'ID Proof',  status: 'Uploaded', expiry: null }, { type: 'Tax Form', status: 'Uploaded', expiry: null }, { type: 'Contract', status: 'Uploaded', expiry: '2025‑12‑31' } ] },
    { id: 2,  empid: 'EMP1002', name: 'Aisha Khan', department: 'Finance',  status: 'Expiring Soon',  lastUpdated: '2025‑05‑26', documents: [ { type: 'ID Proof',  status: 'Uploaded', expiry: null }, { type: 'Tax Form', status: 'Uploaded', expiry: null }, { type: 'Contract', status: 'Uploaded', expiry: '2025‑06‑10' } ] },
    { id: 3,  empid: 'EMP1003', name: 'Rahul Verma',department: 'IT',       status: 'Non‑compliant',  lastUpdated: '2025‑05‑20', documents: [ { type: 'ID Proof',  status: 'Missing',  expiry: null }, { type: 'Tax Form', status: 'Uploaded', expiry: null }, { type: 'Contract', status: 'Expired',  expiry: '2024‑12‑31' } ] },
    { id: 4,  empid: 'EMP1004', name: 'Meera Patel',department: 'Sales',    status: 'Compliant',      lastUpdated: '2025‑05‑27', documents: [] },
    { id: 5,  empid: 'EMP1005', name: 'Carlos Ruiz',department: 'Marketing',status: 'Expiring Soon',  lastUpdated: '2025‑05‑25', documents: [] },
    { id: 6,  empid: 'EMP1006', name: 'Liu Wei',     department: 'IT',       status: 'Compliant',      lastUpdated: '2025‑05‑22', documents: [] },
    { id: 7,  empid: 'EMP1007', name: 'Sara Ali',    department: 'HR',       status: 'Non‑compliant',  lastUpdated: '2025‑05‑23', documents: [] },
    { id: 8,  empid: 'EMP1008', name: 'Tom Smith',   department: 'Finance',  status: 'Compliant',      lastUpdated: '2025‑05‑29', documents: [] },
    { id: 9,  empid: 'EMP1009', name: 'Emily Wong',  department: 'Legal',    status: 'Expiring Soon',  lastUpdated: '2025‑05‑21', documents: [] },
    { id:10,  empid: 'EMP1010', name: 'Ivan Petrov', department: 'IT',       status: 'Compliant',      lastUpdated: '2025‑05‑24', documents: [] },
    { id:11,  empid: 'EMP1011', name: 'Fatima Noor', department: 'HR',       status: 'Non‑compliant',  lastUpdated: '2025‑05‑18', documents: [] },
    { id:12,  empid: 'EMP1012', name: 'Ken Adams',   department: 'Sales',    status: 'Compliant',      lastUpdated: '2025‑05‑17', documents: [] },
    { id:13,  empid: 'EMP1013', name: 'Olivia Lee',  department: 'IT',       status: 'Expiring Soon',  lastUpdated: '2025‑05‑16', documents: [] },
    { id:14,  empid: 'EMP1014', name: 'Hiro Tanaka', department: 'Marketing',status: 'Compliant',      lastUpdated: '2025‑05‑15', documents: [] },
    { id:15,  empid: 'EMP1015', name: 'Sandra Kim',  department: 'Finance',  status: 'Non‑compliant',  lastUpdated: '2025‑05‑14', documents: [] },
  ];

  const filtered = filter === 'All' ? employees : employees.filter(e => e.status === filter);

  const statusBadge = (status) => {
    const color = status === 'Compliant' ? 'green' : status === 'Expiring Soon' ? 'yellow' : 'red';
    return (
      <span className={`bg-${color}-100 text-${color}-800 text-xs font-semibold px-2.5 py-0.5 rounded`}>{status}</span>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      {/* Sidebar */}
      <SideBar />

      {/* Main */}
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6 text-center text-indigo-700">Employee Compliance Dashboard</h1>

        {/* Summary Boxes */}
        <div className="flex gap-4 overflow-x-auto pb-4 justify-center">
          {['Compliant', 'Expiring Soon', 'Non‑compliant', 'All'].map((status) => {
            const count = status === 'All' ? employees.length : employees.filter(e => e.status === status).length;
            return (
              <div
                key={status}
                onClick={() => setFilter(status)}
                className={`min-w-[180px] bg-white rounded-xl shadow cursor-pointer transition border-2 flex flex-col items-center p-4 ${
                  filter === status ? 'border-indigo-500 bg-indigo-400' : 'border-transparent'
                }`}
              >
                <p className="text-md font-medium text-center">{status}</p>
                <p className="text-3xl font-bold text-indigo-600 text-center">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Employee Table */}
        <div className="mt-6 overflow-x-auto bg-white shadow rounded-xl">
          <table className="min-w-full divide-y divide-gray-200 text-center">
            <thead className="bg-indigo-500 text-sm text-gray-100">
              <tr>
                <th className="px-4 py-3">Employee ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Updated</th>
                <th className="px-4 py-3">View</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{emp.empid}</td>
                  <td className="px-4 py-3">{emp.name}</td>
                  <td className="px-4 py-3">{emp.department}</td>
                  <td className="px-4 py-3 flex justify-center">{statusBadge(emp.status)}</td>
                  <td className="px-4 py-3">{emp.lastUpdated}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedEmployee(emp)} className="p-1 rounded hover:bg-indigo-50">
                      <Eye size={20} className="text-indigo-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        
{selectedEmployee && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-800 to-indigo-900">
    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 relative border-4 border-indigo-300">
      <button
        onClick={() => setSelectedEmployee(null)}
        className="absolute top-2 right-4 text-gray-600 text-2xl font-bold hover:text-red-500"
      >
        ×
      </button>

      <h2 className="text-2xl font-bold text-center text-indigo-700 mb-6">
        {selectedEmployee.name}&apos;s Document Details
      </h2>

      {/* Documents Table */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Uploaded Documents</h3>
        <table className="w-full border text-sm rounded-lg overflow-hidden shadow">
          <thead className="bg-indigo-600 text-white">
            <tr>
              <th className="py-2 px-3">Type</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Expiry</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-center bg-gray-50">
            {selectedEmployee.documents.length === 0 ? (
              <tr><td colSpan={3} className="py-4">No documents recorded.</td></tr>
            ) : (
              selectedEmployee.documents.map((doc, idx) => (
                <tr key={idx} className="border-t">
                  <td className="py-2 px-3">{doc.type}</td>
                  <td className="py-2 px-3">{doc.status}</td>
                  <td className="py-2 px-3">{doc.expiry || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Additional Details Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Additional Details</h3>
        <table className="w-full border text-sm rounded-lg overflow-hidden shadow">
          <thead className="bg-indigo-600 text-white">
            <tr>
              <th className="py-2 px-3">Document</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Verified On</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-center bg-gray-50">
            <tr>
              <td className="py-2 px-3">Aadhaar Card</td>
              <td className="py-2 px-3">Uploaded</td>
              <td className="py-2 px-3">2025-05-12</td>
            </tr>
            <tr>
              <td className="py-2 px-3">PAN Card</td>
              <td className="py-2 px-3">Uploaded</td>
              <td className="py-2 px-3">2025-05-15</td>
            </tr>
            <tr>
              <td className="py-2 px-3">Bank Details</td>
              <td className="py-2 px-3">Pending</td>
              <td className="py-2 px-3">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}
      </div>
    </div>
  );
}
