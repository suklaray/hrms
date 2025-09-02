import { useState, useEffect } from 'react';
import SideBar from '@/Components/SideBar';
import { useRouter } from 'next/router';
import { 
  FileText, CheckCircle, XCircle, Send, Plus, Eye, Download, 
  Calendar, Clock, AlertTriangle, Users, Settings, Upload,
  Filter, Search, Shield, Edit, Trash2
} from 'lucide-react';
import { getUserFromToken } from '@/lib/getUserFromToken';

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

  return {
    props: {
      user: {
        id: user.id,
        empid: user.empid,
        name: user.name,
        role: user.role,
        email: user.email,
      },
    },
  };
}

export default function DocumentCenter({ user }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('documents');
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('');

  useEffect(() => {
    fetchDocuments();
    fetchEmployees();
  }, []);

  const fetchDocuments = async () => {
    // Mock data with comprehensive document examples
    setDocuments([
      { 
        id: 1, 
        name: 'Employment Contract', 
        type: 'Contract', 
        status: 'signed', 
        empid: 'EMP001', 
        employee_name: 'John Doe', 
        due_date: '2024-12-31', 
        description: 'Standard employment agreement',
        requested_by: 'HR Team',
        created_at: '2024-12-01'
      },
      { 
        id: 2, 
        name: 'NDA Agreement', 
        type: 'Policy', 
        status: 'pending', 
        empid: 'EMP002', 
        employee_name: 'Jane Smith', 
        due_date: '2024-12-25', 
        description: 'Non-disclosure agreement',
        requested_by: 'Legal Team',
        created_at: '2024-12-10'
      },
      { 
        id: 3, 
        name: 'Tax Form W-4', 
        type: 'Form', 
        status: 'not_signed', 
        empid: 'EMP003', 
        employee_name: 'Bob Johnson', 
        due_date: '2024-12-20', 
        description: 'Tax withholding form',
        requested_by: 'Payroll Team',
        created_at: '2024-12-05'
      },
      { 
        id: 4, 
        name: 'Safety Training Certificate', 
        type: 'Certificate', 
        status: 'not_signed', 
        empid: 'EMP001', 
        employee_name: 'John Doe', 
        due_date: '2024-12-15', 
        description: 'Workplace safety certification',
        requested_by: 'Safety Officer',
        created_at: '2024-11-30'
      },
      { 
        id: 5, 
        name: 'Performance Review', 
        type: 'Form', 
        status: 'pending', 
        empid: 'EMP004', 
        employee_name: 'Alice Brown', 
        due_date: '2024-12-28', 
        description: 'Annual performance evaluation',
        requested_by: 'Manager',
        created_at: '2024-12-12'
      }
    ]);
    setLoading(false);
  };

  const fetchEmployees = async () => {
    // Mock employee data
    setEmployees([
      { empid: 'EMP001', name: 'John Doe', role: 'Software Developer' },
      { empid: 'EMP002', name: 'Jane Smith', role: 'Project Manager' },
      { empid: 'EMP003', name: 'Bob Johnson', role: 'Designer' },
      { empid: 'EMP004', name: 'Alice Brown', role: 'QA Engineer' },
      { empid: 'EMP005', name: 'Charlie Wilson', role: 'DevOps Engineer' }
    ]);
  };

  const handleLogout = () => {
    router.push("/login");
  };

  const getStatusBadge = (status, dueDate) => {
    const isOverdue = new Date(dueDate) < new Date() && status !== 'signed';
    
    if (isOverdue) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Overdue
        </span>
      );
    }
    
    switch (status) {
      case 'signed':
        return (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Signed
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Not Signed
          </span>
        );
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.employee_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesEmployee = !selectedEmployee || doc.empid === selectedEmployee;
    return matchesSearch && matchesStatus && matchesEmployee;
  });

  const DocumentsTab = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents or employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="signed">Signed</option>
            <option value="pending">Pending</option>
            <option value="not_signed">Not Signed</option>
          </select>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Employees</option>
            {employees.map(emp => (
              <option key={emp.empid} value={emp.empid}>{emp.name}</option>
            ))}
          </select>
          {(user.role === 'hr' || user.role === 'admin' || user.role === 'superadmin') && (
            <button
              onClick={() => setShowRequestModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Request Document
            </button>
          )}
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                        <div className="text-sm text-gray-500">{doc.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{doc.employee_name}</div>
                    <div className="text-sm text-gray-500">ID: {doc.empid}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {doc.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(doc.status, doc.due_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      {new Date(doc.due_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button className="text-blue-600 hover:text-blue-900 cursor-pointer">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-900 cursor-pointer">
                        <Download className="w-4 h-4" />
                      </button>
                      {(user.role === 'admin' || user.role === 'superadmin') && (
                        <button className="text-red-600 hover:text-red-900 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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

  const PermissionsTab = () => (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Document Access Permissions</h3>
        {user.role === 'admin' && (
          <button
            onClick={() => setShowPermissionModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 cursor-pointer"
          >
            <Settings className="w-4 h-4" /> Manage Permissions
          </button>
        )}
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map(emp => (
            <div key={emp.empid} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{emp.name}</h4>
                  <p className="text-sm text-gray-500">ID: {emp.empid}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600">Access Granted</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SideBar handleLogout={handleLogout} />
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Document Center</h1>
              <p className="text-gray-600">Manage employee and company documents securely</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Role: {user.role}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('documents')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'documents'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Documents
              </button>
              {(user.role === 'admin' || user.role === 'superadmin') && (
                <button
                  onClick={() => setActiveTab('permissions')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'permissions'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Shield className="w-4 h-4 inline mr-2" />
                  Permissions
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'documents' && <DocumentsTab />}
          {activeTab === 'permissions' && <PermissionsTab />}
        </div>
      </div>

      {/* Request Document Modal */}
      {showRequestModal && (
        <DocumentRequestModal
          onClose={() => setShowRequestModal(false)}
          employees={employees}
          onSubmit={fetchDocuments}
        />
      )}

      {/* Permission Modal */}
      {showPermissionModal && (
        <PermissionModal
          onClose={() => setShowPermissionModal(false)}
          employees={employees}
        />
      )}
    </div>
  );
}

function DocumentRequestModal({ onClose, employees, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '',
    empid: '',
    due_date: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/documents/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        onSubmit();
        onClose();
      }
    } catch (error) {
      console.error('Failed to request document:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Request Document</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Document Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Type</option>
              <option value="Contract">Contract</option>
              <option value="Policy">Policy</option>
              <option value="Form">Form</option>
              <option value="Certificate">Certificate</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <select
              required
              value={formData.empid}
              onChange={(e) => setFormData({...formData, empid: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Employee</option>
              {employees.map(emp => (
                <option key={emp.empid} value={emp.empid}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              required
              value={formData.due_date}
              onChange={(e) => setFormData({...formData, due_date: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
            >
              Request Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PermissionModal({ onClose, employees }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-4">Manage Document Permissions</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {employees.map(emp => (
            <div key={emp.empid} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h4 className="font-medium">{emp.name}</h4>
                <p className="text-sm text-gray-500">ID: {emp.empid}</p>
              </div>
              <div className="flex items-center space-x-2">
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="mr-2" />
                  View Documents
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  Upload Documents
                </label>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
