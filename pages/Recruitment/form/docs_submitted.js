import React from 'react';
import { CheckCircle } from 'lucide-react';

const DocsSubmitted = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="text-center bg-white rounded-2xl shadow-xl p-12 max-w-md mx-4">
        <div className="mb-6">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-green-600 mb-2">Success!</h1>
          <h2 className="text-xl font-semibold text-gray-800">Documents Submitted Successfully</h2>
        </div>
        <p className="text-gray-600 mb-6 leading-relaxed">
          Thank you for submitting your documents. Our HR team will review them and get back to you soon.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700 text-sm font-medium">
            ✅ All required documents have been received
          </p>
        </div>
      </div>
    </div>
  );
};

export default DocsSubmitted;
