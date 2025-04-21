// src/app/(dashboard)/layout.js
import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 ml-[64px] lg:ml-64 p-8 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}