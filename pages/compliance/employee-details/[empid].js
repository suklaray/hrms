import { useState, useEffect, useCallback } from 'react';
import SideBar from '@/Components/SideBar';
import { useRouter } from 'next/router';
import { 
  FileText, ArrowLeft, Eye, Calendar, Users
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

export default function EmployeeDetails({ user }) {
  const router = useRouter();
  const { empid } = router.query;
  const [employee, setEmployee] = useState(null);
  const [documents, setDocuments] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchEmployeeDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/hr/employee-details/${empid}`);
      if (response.ok) {
        const data = await response.json();
        setEmployee(data.employee);
        setDocuments(data.employee.documents || {});
      }
    } catch (error) {
      console.error('Error fetching employee details:', error);
    } finally {
      setLoading(false);
    }
  }, [empid]);

  useEffect(() => {
    if (empid) {
      fetchEmployeeDetails();
    }
  }, [empid, fetchEmployeeDetails]);

  const handleLogout = () => {
    router.push("/login");
  };

  const handleBack = () => {
    router.push("/compliance/documentCenter");
  };

  const documentTypes = [
    { key: 'resume', label: 'Resume', icon: FileText },
    { key: 'aadhar_card', label: 'Aadhaar Card', icon: FileText },
    { key: 'pan_card', label: 'PAN Card', icon: FileText },
    { key: 'education_certificates', label: 'Education Certificates', icon: FileText },
    { key: 'experience_certificate', label: 'Experience Certificate', icon: FileText }
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <SideBar handleLogout={handleLogout} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <SideBar handleLogout={handleLogout} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Employee Not Found</h2>
            <button 
              onClick={handleBack}
              className="text-blue-600 hover:text-blue-800"
            >
              Back to Document Center
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SideBar handleLogout={handleLogout} />
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button 
                onClick={handleBack}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Employee Details</h1>
                <p className="text-gray-600">{employee.name} - {employee.empid}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Role: {user.role}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Employee Profile Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-lg border border-blue-100 p-8">
            <div className="flex items-start space-x-6">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {employee.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{employee.name}</h2>
                <p className="text-lg text-gray-600 mb-4">{employee.position || 'Employee'} • {employee.empid}</p>
                <div className="flex items-center space-x-4">
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                    employee.status === 'Active' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
                  }`}>
                    {employee.status || 'Active'}
                  </span>
                  <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                    {employee.role?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <Users className="w-6 h-6 mr-3 text-blue-600" />
                Personal Information
              </h3>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Full Name</label>
                  <p className="text-lg font-medium text-gray-900">{employee.name}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Employee ID</label>
                  <p className="text-lg font-medium text-gray-900">{employee.empid}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Email Address</label>
                  <p className="text-lg font-medium text-blue-600">{employee.email}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Contact Number</label>
                  <p className="text-lg font-medium text-gray-900">{employee.contact_number || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Gender</label>
                  <p className="text-lg font-medium text-gray-900">{employee.gender || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</label>
                  <p className="text-lg font-medium text-gray-900">{employee.dob ? new Date(employee.dob).toLocaleDateString('en-GB') : 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Joining Date</label>
                  <p className="text-lg font-medium text-gray-900 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    {employee.date_of_joining ? new Date(employee.date_of_joining).toLocaleDateString('en-GB') : 'N/A'}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Employee Type</label>
                  <p className="text-lg font-medium text-gray-900">{employee.employee_type || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Experience</label>
                  <p className="text-lg font-medium text-gray-900">{employee.experience_years ? `${employee.experience_years} years ${employee.experience_months || 0} months` : 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Qualification</label>
                  <p className="text-lg font-medium text-gray-900">{employee.highest_qualification || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Aadhaar Number</label>
                  <p className="text-lg font-medium text-gray-900">{employee.aadhar_number || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">PAN Number</label>
                  <p className="text-lg font-medium text-gray-900">{employee.pan_number || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <FileText className="w-6 h-6 mr-3 text-blue-600" />
                Documents & Certificates
              </h3>
            </div>
            <div className="p-8">
              <div className="space-y-4">
                {documentTypes.map(({ key, label, icon: Icon }, index) => (
                  <div key={key} className="flex items-center justify-between p-6 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                        {index + 1}
                      </div>
                      <Icon className="w-6 h-6 text-gray-400" />
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{label}</h4>
                        <p className="text-sm text-gray-500">
                          {documents[key] ? 'Document available' : 'Not submitted yet'}
                        </p>
                      </div>
                    </div>
                    <div>
                      {documents[key] ? (
                        <a
                          href={`/api/hr/view-document/${employee.empid}?type=${key}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                        >
                          <Eye className="w-5 h-5 mr-2" />
                          View Document
                        </a>
                      ) : (
                        <span className="inline-flex items-center px-6 py-3 bg-gray-200 text-gray-500 font-medium rounded-xl">
                          Not Available
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}