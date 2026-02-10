// src/shared/components/Layout.tsx
import { ReactNode } from "react";
import Navbar from "./Navbar";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <Navbar />

      {/* Main content */}
      <main className="flex-1 bg-gray-50 p-4 sm:p-8">
        {children}
      </main>

      {/* Optional footer */}
      <footer className="bg-gray-200 text-gray-700 text-center p-4 mt-auto">
        &copy; {new Date().getFullYear()} ExamPortal. All rights reserved.
      </footer>
    </div>
  );
};

export default Layout;
