import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
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
    <>
      <Head>
        <title>Employee Details - HRMS</title>
      </Head>
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
        <div className="p-4 md:p-6 space-y-6">

          {/* Employee Profile Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-lg md:text-xl font-bold shadow-md">
                {employee.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{employee.name}</h2>
                <p className="text-sm md:text-base text-gray-600 mb-3">{employee.position || 'Employee'} • {employee.empid}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    employee.status === 'Active' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
                  }`}>
                    {employee.status || 'Active'}
                  </span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                    {employee.role?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>


          {/* Personal Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 md:px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Personal Information
              </h3>
            </div>
            <div className="p-4 md:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name</label>
                  <p className="text-sm font-medium text-gray-900 break-words">{employee.name}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee ID</label>
                  <p className="text-sm font-medium text-gray-900">{employee.empid}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email Address</label>
                  <p className="text-sm font-medium text-blue-600 break-all">{employee.email}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact Number</label>
                  <p className="text-sm font-medium text-gray-900">{employee.contact_number || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</label>
                  <p className="text-sm font-medium text-gray-900">{employee.gender || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</label>
                  <p className="text-sm font-medium text-gray-900">{employee.dob ? new Date(employee.dob).toLocaleDateString('en-GB') : 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Joining Date</label>
                  <p className="text-sm font-medium text-gray-900 flex items-center">
                    <Calendar className="w-4 h-4 mr-1 text-blue-600" />
                    {employee.date_of_joining ? new Date(employee.date_of_joining).toLocaleDateString('en-GB') : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee Type</label>
                  <p className="text-sm font-medium text-gray-900">{employee.employee_type || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Experience</label>
                  <p className="text-sm font-medium text-gray-900">{employee.experience_years ? `${employee.experience_years} years ${employee.experience_months || 0} months` : 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Qualification</label>
                  <p className="text-sm font-medium text-gray-900 break-words">{employee.highest_qualification || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Aadhaar Number</label>
                  <p className="text-sm font-medium text-gray-900">{employee.aadhar_number || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">PAN Number</label>
                  <p className="text-sm font-medium text-gray-900">{employee.pan_number || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>


          {/* Documents */}
<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
  <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 md:px-6 py-4 border-b border-gray-200">
    <h3 className="text-lg font-bold text-gray-900 flex items-center">
      <FileText className="w-5 h-5 mr-2 text-blue-600" />
      Documents & Certificates
    </h3>
  </div>
  <div className="p-4 md:p-6">
    <div className="space-y-3">
      {documentTypes.map(({ key, label, icon: Icon }, index) => (
        <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-sm transition-all duration-200 space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
              {index + 1}
            </div>
            <Icon className="w-5 h-5 text-gray-400" />
            <div>
              <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
              <p className="text-xs text-gray-500">
                {documents[key] ? 'Document available' : 'Not submitted yet'}
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            {documents[key] ? (
              <button
                onClick={() => {
                  // Try to open the document, with error handling
                  const url = `/api/hr/view-document/${employee.empid}?type=${key}`;
                  window.open(url, '_blank');
                }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
              >
                <Eye className="w-4 h-4 mr-1" />
                View Document
              </button>
            ) : (
              <span className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-500 text-xs font-medium rounded-lg">
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
    </>
  );
}