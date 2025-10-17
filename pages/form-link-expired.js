import Head from "next/head";

export default function FormLinkExpired() {
  return (
    <>
      <Head>
        <title>Link Expired - HRMS</title>
      </Head>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Form Link Has Expired
          </h1>
          <p className="text-gray-600 mb-6">
            The form link you are trying to access has expired and is no longer valid. Form links have a limited validity period for security purposes.
          </p>
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>Link Expired:</strong> This form link is no longer active and cannot be used to submit documents.
              </p>
            </div>
            <p className="text-sm text-gray-500">
              Please contact the HR department to request a new form link if you still need to submit your documents.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}