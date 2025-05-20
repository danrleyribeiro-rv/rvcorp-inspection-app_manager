// src/app/(dashboard)/layout.js 
"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/context/auth-context";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 ml-[64px] lg:ml-64 p-8 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}