import { useState } from 'react';
import SideBar from '@/Components/SideBar';
import { useRouter } from 'next/router';
import { FileText, CheckCircle, XCircle, Send } from 'lucide-react';

export default function DocumentCenter() {
  const router = useRouter();
  const [documents, setDocuments] = useState([
    { id: 'EMP1001', name: 'Employment Contract', type: 'Employment', status: 'Not Signed', date: '2025-05-01' },
    { id: 'EMP1002', name: 'Tax Declaration Form', type: 'Tax', status: 'Signed', date: '2025-04-10' },
    { id: 'EMP1003', name: 'Medical Insurance Form', type: 'Medical', status: 'Not Signed', date: '2025-05-05' },
  ]);

  const handleLogout = () => {
    router.push("/login");
  };

  const handleSignDocument = (documentId) => {
    alert(`Sending document ${documentId} for signature via DocuSign/AdobeSign`);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-200 via-white to-purple-200">
      <SideBar handleLogout={handleLogout} />
      <div className="flex-1 p-6">
        {/* Table */}
        <div className="bg-white shadow-xl rounded-2xl p-6 overflow-x-auto">
          <h2 className="text-3xl font-bold mb-6 text-indigo-700 text-center">Document Center</h2>
          <table className="min-w-full divide-y divide-indigo-300 rounded-lg overflow-hidden">
            <thead className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white uppercase">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-left">Document Name</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Type</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Status</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Date</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {documents.map((doc, index) => (
                <tr key={doc.id} className={index % 2 === 0 ? "bg-indigo-50" : "bg-white"}>
                  <td className="px-4 py-2 font-medium text-gray-800">{doc.name}</td>
                  <td className="px-4 py-2">{doc.type}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${
                        doc.status === 'Signed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {doc.status === 'Signed' ? (
                        <><CheckCircle className="w-3 h-3" /> {doc.status}</>
                      ) : (
                        <><XCircle className="w-3 h-3" /> {doc.status}</>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2">{doc.date}</td>
                  <td className="px-4 py-2">
                    {doc.status === 'Not Signed' ? (
                      <button
                        onClick={() => handleSignDocument(doc.id)}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-full flex items-center gap-1 text-sm"
                        title="Request Signature"
                      >
                        <Send className="w-3 h-3" />
                        Request
                      </button>
                    ) : (
                      <span className="text-green-600 text-sm font-medium">Completed</span>
                    )}
                  </td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-gray-500 py-6">
                    No documents found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
