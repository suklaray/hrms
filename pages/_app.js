import "@/styles/globals.css";
import { useEffect } from "react";
import axios from "axios";
import { Toaster } from "react-hot-toast";
import Footer from "@/Components/Footer";
import Header from "@/Components/Header";
import EmployeeHelperBot from "@/Components/EmployeeHelperBot";
import AutoLogoutTimer from "@/Components/AutoLogoutTimer";
import { useRouter } from "next/router";
import { ToastContainer } from 'react-toastify';
//import { confirmAlert } from 'react-confirm-alert';

import 'react-toastify/dist/ReactToastify.css';
import 'react-confirm-alert/src/react-confirm-alert.css';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error.response?.status;
        if (status === 403) {
          if (router.pathname !== '/403') {
            router.replace('/403');
          }
        } else if (status === 401) {
          const publicPaths = ['/login', '/employee/login', '/signup', '/forgot-password', '/403'];
          if (!publicPaths.includes(router.pathname)) {
            router.replace('/login');
          }
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [router]);

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
      <AutoLogoutTimer />
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
