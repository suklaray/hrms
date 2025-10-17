import "@/styles/globals.css";
import { Toaster } from "react-hot-toast";
import Footer from "@/Components/Footer";
import Header from "@/Components/Header";
import EmployeeHelperBot from "@/Components/EmployeeHelperBot";
import { useRouter } from "next/router";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  // Define paths where header/footer should be hidden
  const noLayoutPaths = [
    "/Recruitment/form",
    "/Recruitment/docs_submitted",
    "/form-already-submitted",
    "/unauthorized-form-access",
    "/form-link-expired",
    "/form-locked-device"
  ];

  // Check if current path matches any no-layout path
  const hideLayout = noLayoutPaths.some(
    (path) => router.pathname.startsWith(path) || router.pathname === path
  );

  return (
    <div className="min-h-screen w-full overflow-x-auto">
      {!hideLayout && <Header />}
      <main className="min-w-full">
        <Component {...pageProps} />
        <ToastContainer
          position="top-center"
          //autoClose={3000}
          hideProgressBar={false}
          closeOnClick
          pauseOnHover
        />
        <Toaster position="top-center" reverseOrder={false} />
      </main>
      {!hideLayout && <Footer />}
      {!hideLayout && <EmployeeHelperBot />}
    </div>
  );
}
