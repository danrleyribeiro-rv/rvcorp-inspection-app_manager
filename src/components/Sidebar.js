// src/components/Sidebar.js
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  LayoutDashboard,
  Search,
  Users,
  CircleDot,
  Settings,
  LogOut,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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
  const { signOut, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    last_name: "",
    profession: "",
    profileImageUrl: "",
  });

  useEffect(() => {
    if (user?.uid) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      const profileRef = doc(db, "managers", user.uid);
      const profileDoc = await getDoc(profileRef);

      if (profileDoc.exists()) {
        const data = profileDoc.data();
        setProfileData({
          name: data.name || "",
          last_name: data.last_name || "",
          profession: data.profession || "",
          profileImageUrl: data.profileImageUrl || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      // Clear auth token cookie
      document.cookie =
        "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getAvatarLetters = () => {
    return `${profileData.name.charAt(0)}${profileData.last_name.charAt(0)}`.toUpperCase();
  };

  return (
    <aside
      className={`h-screen fixed left-0 top-0 z-40 flex flex-col bg-background border-r transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Avatar className={`${isCollapsed ? "h-10 w-10" : "h-12 w-12"}`}>
            <AvatarImage src={profileData.profileImageUrl} />
            <AvatarFallback>{getAvatarLetters()}</AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div>
              <div className="font-semibold leading-none">
                {`${profileData.name} ${profileData.last_name}`.trim()}
              </div>
              <div className="text-xs text-muted-foreground">
                {profileData.profession || "Gerente"}
              </div>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="ml-2"
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-1">
          <li>
            <Link
              href="/projects"
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                pathname === "/projects"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              } ${isCollapsed ? "justify-center" : ""}`}
            >
              <LayoutDashboard className="h-5 w-5" />
              {!isCollapsed && <span>Projetos</span>}
            </Link>
          </li>
          <li>
            <Link
              href="/inspections"
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                pathname === "/inspections"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              } ${isCollapsed ? "justify-center" : ""}`}
            >
              <Search className="h-5 w-5" />
              {!isCollapsed && <span>Inspeções</span>}
            </Link>
          </li>
          <li>
            <Link
              href="/templates"
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                pathname === "/templates"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              } ${isCollapsed ? "justify-center" : ""}`}
            >
              <CircleDot className="h-5 w-5" />
              {!isCollapsed && <span>Templates</span>}
            </Link>
          </li>
          <li>
            <Link
              href="/inspectors"
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                pathname === "/inspectors"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              } ${isCollapsed ? "justify-center" : ""}`}
            >
              <Users className="h-5 w-5" />
              {!isCollapsed && <span>Vistoriadores</span>}
            </Link>
          </li>
          <li>
            <Link
              href="/clients"
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                pathname === "/clients"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              } ${isCollapsed ? "justify-center" : ""}`}
            >
              <Users className="h-5 w-5" />
              {!isCollapsed && <span>Clientes</span>}
            </Link>
          </li>
        </ul>
        <Separator className="my-4" />
        <ul className="space-y-1">
          <li>
            <Link
              href="/settings"
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                pathname === "/settings"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              } ${isCollapsed ? "justify-center" : ""}`}
            >
              <Settings className="h-5 w-5" />
              {!isCollapsed && <span>Configurações</span>}
            </Link>
          </li>
        </ul>
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
    </aside>
  );
}