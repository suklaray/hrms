import { useState } from 'react';
import SideBar from "@/Components/SideBar";

export default function HRPolicyManagement() {
  const [policies, setPolicies] = useState([
    { id: 'POL1001', title: 'Code of Conduct', description: 'Our company’s code of conduct', issuedDate: '2025-04-20', acknowledgements: [] },
    { id: 'POL1002', title: 'Leave Policy', description: 'Company leave policy details', issuedDate: '2025-03-15', acknowledgements: [] },
    { id: 'POL1003', title: 'Data Protection Policy', description: 'Policy to protect employee data', issuedDate: '2025-03-10', acknowledgements: [] },
  ]);

  const [employees, setEmployees] = useState([
    { id: 'EMP001', name: 'John Doe' },
    { id: 'EMP002', name: 'Jane Smith' },
    { id: 'EMP003', name: 'Mike Johnson' },
    { id: 'EMP004', name: 'Sara Williams' },
    { id: 'EMP005', name: 'David Lee' },
  ]);

  const [newPolicy, setNewPolicy] = useState({
    title: '',
    description: '',
    file: null,
    issuedDate: '',
  });

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5); // Need to adjust for items per page
  const [showModal, setShowModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [employeeAcknowledgements, setEmployeeAcknowledgements] = useState({});

  const filteredPolicies = policies.filter((policy) =>
    policy.title.toLowerCase().includes(search.toLowerCase())
  );

  const handlePolicyUpload = (event) => {
    event.preventDefault();
    const newPolicyObj = { 
      id: `POL${Date.now()}`, 
      title: newPolicy.title, 
      description: newPolicy.description, 
      issuedDate: newPolicy.issuedDate, 
      acknowledgements: [] 
    };
    setPolicies((prevPolicies) => [...prevPolicies, newPolicyObj]);
    setNewPolicy({ title: '', description: '', file: null, issuedDate: '' });
    alert('Policy uploaded successfully!');
  };

  // Handle Employee Acknowledgement
  const handleAcknowledge = (policyId, employeeId) => {
    setPolicies((prevPolicies) =>
      prevPolicies.map((policy) =>
        policy.id === policyId
          ? {
              ...policy,
              acknowledgements: [
                ...policy.acknowledgements,
                { employeeId, date: new Date().toISOString().split('T')[0] },
              ],
            }
          : policy
      )
    );
    setEmployeeAcknowledgements((prev) => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], [policyId]: true },
    }));
    alert(`Employee ${employeeId} acknowledged policy ${policyId} successfully.`);
  };

  // Handle Modal Toggle
  const toggleModal = (policy) => {
    setSelectedPolicy(policy);
    setShowModal(!showModal);
  };

  // Handle Pagination
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Paginate policies
  const indexOfLastPolicy = currentPage * itemsPerPage;
  const indexOfFirstPolicy = indexOfLastPolicy - itemsPerPage;
  const currentPolicies = filteredPolicies.slice(indexOfFirstPolicy, indexOfLastPolicy);

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      <SideBar />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6 text-center text-indigo-700">HR Policy Management</h1>

        {/* Search Filter */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search Policies"
            className="w-full px-4 py-2 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Upload Policy Form */}
        <div className="mb-6 p-4 bg-white shadow-lg rounded-lg">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Upload New Policy</h2>
          <form onSubmit={handlePolicyUpload} className="space-y-4">
            <input
              type="text"
              placeholder="Policy Title"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={newPolicy.title}
              onChange={(e) => setNewPolicy({ ...newPolicy, title: e.target.value })}
              required
            />
            <textarea
              placeholder="Policy Description"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={newPolicy.description}
              onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })}
              required
            />
            <input
              type="date"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={newPolicy.issuedDate}
              onChange={(e) => setNewPolicy({ ...newPolicy, issuedDate: e.target.value })}
              required
            />
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200"
            >
              Upload Policy
            </button>
          </form>
        </div>

        {/* Policy List with Pagination */}
        <div className="overflow-x-auto bg-white shadow-lg rounded-xl mb-6">
          <table className="min-w-full divide-y divide-gray-200 text-center">
            <thead className="bg-indigo-100 text-sm text-indigo-700">
              <tr>
                <th className="px-6 py-3">Policy Title</th>
                <th className="px-6 py-3">Date Issued</th>
                <th className="px-6 py-3">Acknowledgement Status</th>
                <th className="px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentPolicies.map((policy) => (
                <tr key={policy.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-3">{policy.title}</td>
                  <td className="px-6 py-3">{policy.issuedDate}</td>
                  <td className="px-6 py-3">
                    {policy.acknowledgements.length === 0 ? (
                      <span className="text-gray-500">No Acknowledgements</span>
                    ) : (
                      <span className="text-indigo-600">{policy.acknowledgements.length} Employee(s) Acknowledged</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <button
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      onClick={() => toggleModal(policy)}
                    >
                      View/Manage Acknowledgements
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-center space-x-4">
          {Array.from({ length: Math.ceil(filteredPolicies.length / itemsPerPage) }, (_, index) => (
            <button
              key={index}
              onClick={() => paginate(index + 1)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              {index + 1}
            </button>
          ))}
        </div>

        {/* Modal for Viewing Acknowledgements */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-xl max-w-lg w-full">
              <h2 className="text-xl font-semibold text-indigo-600 mb-4">{selectedPolicy.title}</h2>
              <div className="space-y-4">
                {employees.map((employee) => (
                  <div key={employee.id} className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={employeeAcknowledgements[employee.id]?.[selectedPolicy.id] || false}
                      onChange={() => handleAcknowledge(selectedPolicy.id, employee.id)}
                      className="h-4 w-4 text-indigo-600"
                    />
                    <span>{employee.name}</span>
                  </div>
                ))}
              </div>
              <button
                className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}  
