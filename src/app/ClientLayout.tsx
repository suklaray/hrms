"use client";

import { useEffect, Suspense } from "react";
import axios from "axios";
import { Toaster } from "react-hot-toast";
import Footer from "@/Components/Footer";
import Header from "@/Components/Header";
import EmployeeHelperBot from "@/Components/EmployeeHelperBot";
import AutoLogoutTimer from "@/Components/AutoLogoutTimer";
import SideBar from "@/Components/SideBar";
import { AppShellContext } from "@/contexts/AppShellContext";
import { activateSharedSidebarShell } from "@/lib/appShell";
import { useRouter, usePathname } from "next/navigation";
import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";
import "react-confirm-alert/src/react-confirm-alert.css";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/";

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error.response?.status;
        if (status === 403) {
          if (pathname !== "/403") {
            router.replace("/403");
          }
        } else if (status === 401) {
          const publicPaths = ["/login", "/signup", "/forgot-password", "/403", "/"];
          if (!publicPaths.includes(pathname)) {
            router.replace("/login");
          }
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [router, pathname]);

  const noLayoutPaths = [
    "/Recruitment/form",
    "/Recruitment/docs_submitted",
    "/form-already-submitted",
    "/unauthorized-form-access",
    "/form-link-expired",
    "/form-locked-device",
  ];

  const hideLayout = noLayoutPaths.some(
    (path) => pathname.startsWith(path) || pathname === path
  );

  const publicPaths = ["/login", "/signup", "/forgot-password", "/403", "/", "/AboutUs", "/Contact", "/privacy-policy", "/terms-of-service", 
            "/Recruitment/form", "/Recruitment/docs_submitted", "/form-already-submitted", "/unauthorized-form-access", 
            "/form-link-expired", "/form-locked-device"];
  const showAppShell = !hideLayout && !publicPaths.includes(pathname);

  if (showAppShell && typeof window !== "undefined") {
    activateSharedSidebarShell();
  }

  return (
    <AppShellContext.Provider value={{ showAppShell }}>
      <div className="min-h-screen w-full overflow-x-auto bg-slate-50">
        <AutoLogoutTimer />
        {!hideLayout && (
          <Suspense fallback={null}>
            <Header />
          </Suspense>
        )}

        {showAppShell ? (
          <div className="flex min-h-[calc(100vh-9rem)] w-full">
            <SideBar isSharedShell />
            <main className="flex-1 min-w-0 overflow-hidden">
              {children}
            </main>
          </div>
        ) : (
          <main className="min-w-full">
            {children}
          </main>
        )}

        <ToastContainer
          position="top-center"
          hideProgressBar={false}
          closeOnClick
          pauseOnHover
        />
        <Toaster position="top-center" reverseOrder={false} />
        {!hideLayout && <Footer />}
        {!hideLayout && <EmployeeHelperBot />}
      </div>
    </AppShellContext.Provider>
  );
}
