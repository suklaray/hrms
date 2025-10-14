import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import axios from "axios";

function FormAlreadySubmitted() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get("/api/auth/me");
        setUser(response.data.user);
      } catch (error) {
        console.log("Not authenticated");
      }
    };
    checkAuth();
  }, []);

  const isAdminUser = user && ["admin", "superadmin", "HR"].includes(user.role);

  const handleBackToRecruitment = () => {
    router.push("/Recruitment/recruitment");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <div className="mb-6">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Form Already Submitted
          </h1>
          <p className="text-gray-600">
            {isAdminUser
              ? "The candidate has already submitted their onboarding form."
              : "Your onboarding form has already been successfully submitted."}
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 text-sm">
            {isAdminUser
              ? "The candidate's application is being processed. You can view their details in the recruitment dashboard."
              : "Your application is being processed by our HR team. You will be contacted soon with further instructions."}
          </p>
        </div>

        {isAdminUser && (
          <button
            onClick={handleBackToRecruitment}
            className="w-full mb-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Recruitment Page
          </button>
        )}

        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            {isAdminUser
              ? "For any queries regarding candidate applications:"
              : "If you have any questions, please contact our HR department:"}
          </p>
          <div className="text-sm text-gray-700">
            {isAdminUser ? (
              ""
            ) : (
              <>
                📧 hr@company.com
                <br />
                📞 +91-XXXX-XXXX-XX
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

FormAlreadySubmitted.getLayout = function getLayout(page) {
  return page;
};

export default FormAlreadySubmitted;
