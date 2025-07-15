// src/app/(dashboard)/layout.js
"use client";

import { useState, useEffect } from "react";
import { Sidebar, MobileNav } from "@/components/Sidebar";
import { useMediaQuery } from "@/hooks/use-media-query";

export default function DashboardLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  
  // Automatically collapse sidebar on smaller screens
  useEffect(() => {
    if (!isDesktop) {
      setIsCollapsed(true);
    }
  }, [isDesktop]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MobileNav />
      <Sidebar onToggle={toggleSidebar} isCollapsed={isCollapsed} />
      <main 
        className={`flex-1 transition-all duration-300 ${
          isDesktop ? (isCollapsed ? "md:pl-16" : "md:pl-64") : ""
        }`}
      >
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-full">
          {children}
        </div>
      </main>
    </div>
  );
}