// src/components/Sidebar.js
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ClipboardList,
  Search,
  Users,
  CircleDot,
  MessageSquare,
  FileText,
  Settings,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import Image from "next/image";

const menuItems = [
  { href: "/projects", label: "Projetos", icon: LayoutDashboard },
  { href: "/inspections", label: "Inspeções", icon: Search },
  { href: "/templates", label: "Templates", icon: CircleDot },
  { href: "/inspectors", label: "Vistoriadores", icon: Users },
  { href: "/clients", label: "Clientes", icon: Users }, 
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleLogout = async () => {
    try {
      await signOut();
      // Clear auth token cookie
      document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-background border-r flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="p-4 flex justify-center items-center">
        <div className="relative w-12 h-12">
          <Image src="/logo.png" alt="RV Corp Logo" fill className="object-contain" />
        </div>
      </div>

      <nav className="flex-1 px-2">
        {menuItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-3 py-2 my-1 rounded-lg transition-colors
              ${
                pathname === href
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              }
              ${isCollapsed ? "justify-center" : ""}`}
          >
            <Icon size={20} />
            {!isCollapsed && <span>{label}</span>}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={toggleTheme}
        >
          {theme === "dark" ? (
            <Moon className="h-4 w-4 mr-2" />
          ) : (
            <Sun className="h-4 w-4 mr-2" />
          )}
          {!isCollapsed && <span>Trocar tema</span>}
        </Button>

        <Button
          variant="destructive"
          size="sm"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!isCollapsed && <span>Sair</span>}
        </Button>
      </div>
    </div>
  );
}