import Head from "next/head";

function UnauthorizedFormAccess() {
  return (
    <>
      <Head>
        <title>Unauthorized Access - HRMS</title>
      </Head>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            You are not authorized to fill this form
          </h1>
          <p className="text-gray-600 mb-6">
            The form link you are trying to access is either invalid, expired, or you don't have permission to access it.
          </p>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              If you believe this is an error, please contact the HR department.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

UnauthorizedFormAccess.getLayout = function getLayout(page) {
  return page;
};

export default UnauthorizedFormAccess;