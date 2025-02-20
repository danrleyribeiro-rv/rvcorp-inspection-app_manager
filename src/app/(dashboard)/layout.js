// src/app/(dashboard)/layout.js
import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="pl-64 p-8">{children}</main>
    </div>
  );
}