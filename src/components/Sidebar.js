// src/components/Sidebar.js
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
    profileImageUrl: ""
  });

  useEffect(() => {
    if (user?.uid) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      const profileRef = doc(db, 'managers', user.uid);
      const profileDoc = await getDoc(profileRef);
      
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        setProfileData({
          name: data.name || "",
          last_name: data.last_name || "",
          profession: data.profession || "",
          profileImageUrl: data.profileImageUrl || ""
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
      document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getAvatarLetters = () => {
    return `${profileData.name.charAt(0)}${profileData.last_name.charAt(0)}`.toUpperCase();
  };

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-background border-r flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Profile Section */}
      <div className={`p-4 border-b ${isCollapsed ? "items-center" : "items-start"} flex flex-col`}>
        <div className="relative flex items-center justify-between w-full">
          <Avatar className={`${isCollapsed ? "h-10 w-10" : "h-14 w-14"}`}>
            <AvatarImage src={profileData.profileImageUrl} />
            <AvatarFallback>{getAvatarLetters()}</AvatarFallback>
          </Avatar>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar} 
            className="absolute -right-4 top-1/2 transform -translate-y-1/2 bg-background border rounded-full h-8 w-8"
          >
            {isCollapsed ? 
              <ChevronRight className="h-4 w-4" /> : 
              <ChevronLeft className="h-4 w-4" />
            }
          </Button>
        </div>
        
        {!isCollapsed && (
          <div className="mt-3 w-full">
            <h3 className="font-medium truncate">
              {`${profileData.name} ${profileData.last_name}`.trim()}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {profileData.profession || "Gerente"}
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 overflow-y-auto">
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