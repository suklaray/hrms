import { useRouter } from "next/router";
import Head from "next/head";
import { ShieldX, ArrowLeft, Home, LogOut } from "lucide-react";

export default function ForbiddenPage() {
  const router = useRouter();

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      router.push("/login");
    }
  };

  return (
    <>
      <Head>
        <title>Access Denied | HRMS</title>
        <meta
          name="description"
          content="You do not have permission to access this page."
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center px-6">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 sm:p-10 text-center">

            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                <ShieldX className="w-10 h-10 text-red-500" />
              </div>
            </div>

            {/* Error Code */}
            <p className="text-6xl font-bold text-gray-800 mb-2">
              403
            </p>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              Access Denied
            </h1>

            {/* Description */}
            <p className="text-gray-600 leading-relaxed mb-8">
              You don&apos;t have permission to access this page or perform this
              action. Please contact your administrator if you believe this
              is an error.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">

              <button
                onClick={handleGoBack}
                className="flex items-center justify-center gap-2 px-5 py-3
                  rounded-lg border border-gray-300
                  text-gray-700 font-medium
                  hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>

              <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center justify-center gap-2 px-5 py-3
                  rounded-lg bg-blue-600
                  text-white font-medium
                  hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 px-5 py-3
                  rounded-lg bg-gray-100
                  text-gray-700 font-medium
                  hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>

            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500 mt-6">
            HRMS • Human Resource Management System
          </p>
        </div>
      </div>
    </>
  );
}