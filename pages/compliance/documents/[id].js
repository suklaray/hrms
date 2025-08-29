import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import SideBar from "@/Components/SideBar";
import { FileText, CheckCircle, XCircle, AlertCircle, Eye, ArrowLeft } from "lucide-react";

export default function DocumentsPage() {
  const router = useRouter();
  const { id, type } = router.query;
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEmployeeDocuments = useCallback(async () => {
    try {
      if (type === 'candidate') {
        const candidateRes = await fetch(`/api/candidate/${id}`);
        const candidateData = await candidateRes.json();
        console.log('Candidate Data:', candidateData);
        
        const empRes = await fetch(`/api/compliance/candidate-documents?email=${candidateData.email}`);
        const employeeData = await empRes.json();
        console.log('Employee Data:', employeeData);
        
        const hasForm = candidateData.form_submitted;
        const isVerified = candidateData.verification;
        const hasResume = candidateData.resume;
        
        const hasAadhar = employeeData?.aadhar_card || candidateData.aadhar_card;
        const hasPan = employeeData?.pan_card || candidateData.pan_card;
        const hasBankDetails = employeeData?.bank_details || candidateData.bank_details;
        const hasExperience = employeeData?.experience_certificate || candidateData.experience_certificate;
        const hasProfilePhoto = candidateData.profile_photo;
        const hasEducation = employeeData?.education_certificates || candidateData.education_certificates;
        
        console.log('Document check:', {
          hasResume, hasAadhar, hasPan, hasBankDetails, hasExperience, hasProfilePhoto, hasEducation,
          candidateData, employeeData
        });
        
        const uploadedDocs = [hasResume, hasAadhar, hasPan, hasBankDetails].filter(Boolean).length;
        
        let status = "Non-compliant";
        if (hasForm && isVerified && uploadedDocs >= 4) {
          status = "Compliant";
        } else if (hasForm && (isVerified || uploadedDocs >= 2)) {
          status = "Partially Compliant";
        }
        
        setEmployee({
          ...candidateData,
          ...employeeData,
          status,
          documents: [
            { type: "Resume", status: hasResume ? "Uploaded" : "Missing", path: candidateData.resume || employeeData?.resume },
            { type: "Profile Photo", status: hasProfilePhoto ? "Uploaded" : "Missing", path: candidateData.profile_photo },
            { type: "Aadhar Card", status: hasAadhar ? "Uploaded" : "Missing", path: employeeData?.aadhar_card || candidateData.aadhar_card },
            { type: "PAN Card", status: hasPan ? "Uploaded" : "Missing", path: employeeData?.pan_card || candidateData.pan_card },
            { type: "Bank Details", status: hasBankDetails ? "Uploaded" : "Missing", path: employeeData?.bank_details || candidateData.bank_details },
            { type: "Education Certificates", status: hasEducation ? "Uploaded" : "Optional - Missing", path: employeeData?.education_certificates || candidateData.education_certificates },
            { type: "Experience Certificate", status: hasExperience ? "Uploaded" : "Optional - Missing", path: employeeData?.experience_certificate || candidateData.experience_certificate },
            { type: "Application Form", status: hasForm ? "Submitted" : "Missing" },
            { type: "Verification", status: isVerified ? "Verified" : "Pending" }
          ]
        });
      } else {
        const res = await fetch(`/api/compliance/compliance`);
        const employees = await res.json();
        const emp = employees.find(e => e.empid === id);
        
        if (emp) {
          console.log('Employee data:', emp);
          setEmployee({
            ...emp,
            documents: [
              { type: "Resume", status: emp.resume ? "Uploaded" : "Missing", path: emp.resume },
              { type: "Profile Photo", status: emp.profile_photo ? "Uploaded" : "Missing", path: emp.profile_photo },
              { type: "Aadhar Card", status: emp.aadhar_card ? "Uploaded" : "Missing", path: emp.aadhar_card },
              { type: "PAN Card", status: emp.pan_card ? "Uploaded" : "Missing", path: emp.pan_card },
              { type: "Bank Details", status: emp.bank_details ? "Uploaded" : "Missing", path: emp.bank_details },
              { type: "Education Certificates", status: emp.education_certificates ? "Uploaded" : "Optional - Missing", path: emp.education_certificates },
              { type: "Experience Certificate", status: emp.experience_certificate ? "Uploaded" : "Optional - Missing", path: emp.experience_certificate }
            ]
          });
        }
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, [id, type]);

  useEffect(() => {
    if (id && type) {
      fetchEmployeeDocuments();
    }
  }, [id, type, fetchEmployeeDocuments]);

  const getStatusIcon = (status) => {
    switch (status) {
      case "Uploaded":
      case "Submitted":
      case "Verified":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "Missing":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const handleViewDocument = (doc) => {
    if (type === 'candidate') {
      const candidateId = employee.candidate_id;
      switch(doc.type) {
        case 'Resume':
        case 'Profile Photo':
        case 'Aadhar Card':
        case 'PAN Card':
        case 'Bank Details':
        case 'Education Certificates':
        case 'Experience Certificate':
          if (doc.path) {
            // Use same logic as resume - files are in public folder
            const filePath = doc.path.startsWith('/') ? doc.path : `/${doc.path}`;
            window.open(filePath, '_blank');
          }
          break;
        case 'Application Form':
          window.open(`/Recruitment/add/${candidateId}`, '_blank');
          break;
      }
    } else {
      switch(doc.type) {
        case 'Resume':
        case 'Profile Photo':
        case 'Aadhar Card':
        case 'PAN Card':
        case 'Bank Details':
        case 'Education Certificates':
        case 'Experience Certificate':
          if (doc.path) {
            const filePath = doc.path.startsWith('/') ? doc.path : `/${doc.path}`;
            window.open(filePath, '_blank');
          }
          break;
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading documents...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SideBar />
      
      <div className="flex-1 p-6">
        <button
          onClick={() => router.push('/compliance/empCompliance')}
          className="mb-6 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Compliance Management
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
            <div className="text-white">
              <h1 className="text-2xl font-bold">{employee?.name}&apos;s Documents</h1>
              <p className="text-indigo-100 text-sm">
                {type === 'candidate' ? `Candidate ID: ${employee?.candidate_id}` : `Employee ID: ${employee?.empid}`}
              </p>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {employee?.documents?.map((doc, idx) => {
                const isUploaded = doc.status === "Uploaded";
                const isSubmitted = doc.status === "Submitted";
                const isVerified = doc.status === "Verified";
                const isOptional = doc.status.includes("Optional");
                
                return (
                  <div key={idx} className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                    (isUploaded || isSubmitted || isVerified) ? 'border-green-200 bg-green-50' : 
                    isOptional ? 'border-yellow-200 bg-yellow-50' : 
                    'border-red-200 bg-red-50'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-gray-600" />
                        <h3 className="font-medium text-gray-900">{doc.type}</h3>
                      </div>
                      {getStatusIcon(doc.status)}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${
                        (isUploaded || isSubmitted || isVerified) ? 'text-green-700' : 
                        isOptional ? 'text-yellow-700' : 
                        'text-red-700'
                      }`}>
                        {doc.status}
                      </span>
                      
                      {(isUploaded || (doc.type === 'Application Form' && isSubmitted)) && (
                        <button 
                          onClick={() => handleViewDocument(doc)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors cursor-pointer"
                          title="View Document"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Compliance Summary</h4>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>{employee?.documents?.filter(d => d.status === "Uploaded" || d.status === "Submitted" || d.status === "Verified").length} Completed</span>
                </div>
                <div className="flex items-center gap-1">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span>{employee?.documents?.filter(d => d.status === "Missing").length} Missing</span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span>{employee?.documents?.filter(d => d.status.includes("Optional")).length} Optional</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}