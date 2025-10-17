import Head from "next/head";

export default function FormLockedDevice() {
  return (
    <>
      <Head>
        <title>Device Locked - HRMS</title>
      </Head>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Form Locked to Original Device
          </h1>
          <p className="text-gray-600 mb-6">
            This form link is locked to the original device/browser where it was first accessed. You cannot access it from a different device or browser for security reasons.
          </p>
          <div className="space-y-3">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800">
                <strong>Security Notice:</strong> Please use the same device and browser where you first opened this form link.
              </p>
            </div>
            <p className="text-sm text-gray-500">
              If you need to access the form from a different device, please contact the HR department for a new form link.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}