import { Suspense } from "react";
import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "./ClientLayout";
import { StoreProvider } from "@/store/Provider";

export const metadata: Metadata = {
  title: "HRMS Portal",
  description: "Human Resource Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <StoreProvider>
          <Suspense fallback={null}>
            <ClientLayout>{children}</ClientLayout>
          </Suspense>
        </StoreProvider>
      </body>
    </html>
  );
}
