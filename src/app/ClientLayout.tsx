"use client";
//keep sidebar in client component as it uses react hooks and nextjs router
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
import { useAppSelector } from "@/store/hooks";

import "react-toastify/dist/ReactToastify.css";
import "react-confirm-alert/src/react-confirm-alert.css";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const loggingOut = useAppSelector((state) => state.auth.loggingOut);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const initialized = useAppSelector((state) => state.auth.initialized);

  const noLayoutPaths = [
    "/setup/super-admin",
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

  const publicPaths = ["/login", "/signup", "/forgot-password", "/403", "/", "/setup/super-admin", "/AboutUs", "/Contact", "/privacy-policy", "/terms-of-service",
            "/Recruitment/form", "/Recruitment/docs_submitted", "/form-already-submitted", "/unauthorized-form-access",
            "/form-link-expired", "/form-locked-device"];
  const isPublicPath =
    publicPaths.includes(pathname) ||
    noLayoutPaths.some((path) => pathname.startsWith(path));
  const isLeavingProtectedPage =
    !isPublicPath && (loggingOut || (initialized && !isAuthenticated));
  const showAppShell = !hideLayout && !publicPaths.includes(pathname);

  useEffect(() => {
    if (isLeavingProtectedPage) {
      router.replace("/login");
    }
  }, [isLeavingProtectedPage, router]);

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
          const publicPaths = [
            "/login",
            "/signup",
            "/forgot-password",
            "/403",
            "/",
            "/setup/super-admin",
          ];
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

  if (isLeavingProtectedPage) {
    return <div className="min-h-screen w-full bg-slate-50" aria-busy="true" />;
  }

  if (showAppShell && typeof window !== "undefined") {
    activateSharedSidebarShell();
  }

  return (
    <AppShellContext.Provider value={{ showAppShell }}>
      <div className="min-h-screen w-full overflow-x-auto bg-slate-50">
        <AutoLogoutTimer />
        {!hideLayout && !loggingOut && (
          <Suspense fallback={null}>
            <Header />
          </Suspense>
        )}

        {showAppShell ? (
          <div className="flex min-h-[calc(100vh-9rem)] w-full">
            {!loggingOut && <SideBar isSharedShell />}
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
