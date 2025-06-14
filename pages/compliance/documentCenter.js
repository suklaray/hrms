import { useState } from 'react';
import SideBar from '@/Components/SideBar';

export default function DocumentCenter() {
  const [documents, setDocuments] = useState([
    { id: 'EMP1001', name: 'Employment Contract', type: 'Employment', status: 'Not Signed', date: '2025-05-01' },
    { id: 'EMP1002', name: 'Tax Declaration Form', type: 'Tax', status: 'Signed', date: '2025-04-10' },
    { id: 'EMP1003', name: 'Medical Insurance Form', type: 'Medical', status: 'Not Signed', date: '2025-05-05' },
    // More documents...
  ]);

  const handleSignDocument = (documentId) => {
    // Trigger e-signature integration
    alert(`Sending document ${documentId} for signature via DocuSign/AdobeSign`);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      <SideBar />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6 text-center text-indigo-700">Document Center</h1>
        
        {/* Document List Table */}
        <div className="overflow-x-auto bg-white shadow rounded-xl mb-6">
          <table className="min-w-full divide-y divide-gray-200 text-center">
            <thead className="bg-gray-100 text-sm text-gray-700">
              <tr>
                <th className="px-4 py-3">Document Name</th>
                <th className="px-4 py-3">Document Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3">{doc.name}</td>
                  <td className="px-4 py-3">{doc.type}</td>
                  <td className="px-4 py-3">
                    <span className={doc.status === 'Signed' ? 'text-green-600' : 'text-red-600'}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{doc.date}</td>
                  <td className="px-4 py-3">
                    {doc.status === 'Not Signed' && (
                      <button
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200"
                        onClick={() => handleSignDocument(doc.id)}
                      >
                        Request Signature                  
                      </button>
                    )}
                    {doc.status === 'Signed' && <span className="text-green-600">Signed</span>}
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
