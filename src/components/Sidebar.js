// src/components/Sidebar.js
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Menu,
  FileText,
  FolderKanban,
  Plus,
  MessageSquare
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useUnreadCounts } from '@/hooks/use-unread-counts';

// Define the navigation items
const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projetos", icon: FolderKanban },
  { href: "/inspections", label: "Inspeções", icon: Search },
  { href: "/templates", label: "Templates", icon: CircleDot },
  { href: "/inspectors", label: "Vistoriadores", icon: Users },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/chats", label: "Chats", icon: MessageSquare },
  { href: "/settings", label: "Configurações", icon: Settings },
];

// Main navigation component for desktop
export function Sidebar({ onToggle, isCollapsed }) {
  const pathname = usePathname();
  const router = useRouter();
  const unreadCounts = useUnreadCounts();
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  const { theme, setTheme } = useTheme();
  const { signOut, user } = useAuth();
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

  // Function to fetch user profile data
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

  const handleLogout = async () => {
    try {
      await signOut();
      document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getAvatarLetters = () => {
    return `${profileData.name.charAt(0)}${profileData.last_name.charAt(0)}`.toUpperCase();
  };

  // Navigation handlers for the action buttons
  const handleNewInspection = () => {
    router.push('/inspections/create');
  };

  const handleNewTemplate = () => {
    router.push('/templates/new/editor');
  };

  const handleNewProject = () => {
    router.push('/projects/create');
  };

  return (
    <aside
      className={`hidden md:flex h-screen fixed left-0 top-0 z-40 flex-col bg-background border-r transition-all duration-300 ${
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
              <div className="font-semibold leading-none truncate max-w-[120px]">
                {`${profileData.name} ${profileData.last_name}`.trim()}
              </div>
              <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                {profileData.profession || "Gerente"}
              </div>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
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
          {menuItems.map((item) => {
            if (item.href === "/chats") {
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                      pathname === item.href || pathname.startsWith(`${item.href}/`)
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                    } ${isCollapsed ? "justify-center" : ""}`}
                  >
                    <MessageSquare className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate">Chats</span>
                        {totalUnread > 0 && (
                          <span className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-bold">
                            {totalUnread}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                </li>
              );
            }
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    pathname === item.href || pathname.startsWith(`${item.href}/`)
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  } ${isCollapsed ? "justify-center" : ""}`}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
        
        <Separator className="my-4" />
        
        <div className="px-3 py-2 space-y-2">
          <Button
            variant="outline"
            size="sm"
            className={`${isCollapsed ? "justify-center w-9 px-0" : "w-full justify-start"}`}
            onClick={handleNewInspection}
            title="Nova Inspeção"
          >
            <Plus className={`h-4 w-4 ${!isCollapsed && "mr-2"}`} />
            {!isCollapsed && <span className="truncate">Nova Inspeção</span>}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className={`${isCollapsed ? "justify-center w-9 px-0" : "w-full justify-start"}`}
            onClick={handleNewTemplate}
            title="Novo Template"
          >
            <CircleDot className={`h-4 w-4 ${!isCollapsed && "mr-2"}`} />
            {!isCollapsed && <span className="truncate">Novo Template</span>}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className={`${isCollapsed ? "justify-center w-9 px-0" : "w-full justify-start"}`}
            onClick={handleNewProject}
            title="Novo Projeto"
          >
            <FolderKanban className={`h-4 w-4 ${!isCollapsed && "mr-2"}`} />
            {!isCollapsed && <span className="truncate">Novo Projeto</span>}
          </Button>
        </div>
      </nav>
      <div className="p-4 border-t space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className={`${isCollapsed ? "justify-center w-9 px-0" : "w-full justify-start"}`}
          onClick={toggleTheme}
        >
          {theme === "dark" ? (
            <Moon className={`h-4 w-4 ${!isCollapsed && "mr-2"}`} />
          ) : (
            <Sun className={`h-4 w-4 ${!isCollapsed && "mr-2"}`} />
          )}
          {!isCollapsed && <span className="truncate">Trocar tema</span>}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className={`${isCollapsed ? "justify-center w-9 px-0" : "w-full justify-start"}`}
          onClick={handleLogout}
        >
          <LogOut className={`h-4 w-4 ${!isCollapsed && "mr-2"}`} />
          {!isCollapsed && <span className="truncate">Sair</span>}
        </Button>
      </div>
    </aside>
  );
}

// Mobile navigation component
export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { signOut, user } = useAuth();
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

  const handleLogout = async () => {
    try {
      await signOut();
      document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getAvatarLetters = () => {
    return `${profileData.name.charAt(0)}${profileData.last_name.charAt(0)}`.toUpperCase();
  };

  // Navigation handlers for mobile
  const handleNewInspection = () => {
    router.push('/inspections/create');
  };

  const handleNewTemplate = () => {
    router.push('/templates/new/editor');
  };

  const handleNewProject = () => {
    router.push('/projects/create');
  };

  return (
    <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-background px-4 lg:px-6 md:hidden sticky top-0 z-40">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[240px] sm:w-[300px] px-0">
          <div className="px-4 py-2 border-b">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profileData.profileImageUrl} />
                <AvatarFallback>{getAvatarLetters()}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold leading-none truncate">
                  {`${profileData.name} ${profileData.last_name}`.trim()}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {profileData.profession || "Gerente"}
                </div>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-2 py-4">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                      pathname === item.href || pathname.startsWith(`${item.href}/`)
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            
            <Separator className="my-4" />
            
            <div className="px-3 py-2 space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleNewInspection}
              >
                <Plus className="mr-2 h-4 w-4" />
                <span className="truncate">Nova Inspeção</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleNewTemplate}
              >
                <CircleDot className="mr-2 h-4 w-4" />
                <span className="truncate">Novo Template</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleNewProject}
              >
                <FolderKanban className="mr-2 h-4 w-4" />
                <span className="truncate">Novo Projeto</span>
              </Button>
            </div>
            
            <div className="pt-6 space-y-2 px-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={toggleTheme}
              >
                {theme === "dark" ? (
                  <Moon className="mr-2 h-4 w-4" />
                ) : (
                  <Sun className="mr-2 h-4 w-4" />
                )}
                <span>Trocar tema</span>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="w-full justify-start"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </Button>
            </div>
          </nav>
        </SheetContent>
      </Sheet>
      <div className="font-semibold">
        Lince
      </div>
    </header>
  );
}