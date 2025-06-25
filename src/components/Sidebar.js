// src/components/Sidebar.js
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNavigation } from "@/hooks/use-navigation";
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
  MessageSquare,
  Building2
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUnreadCounts } from '@/hooks/use-unread-counts';

// Define the navigation items
const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projetos", icon: FolderKanban },
  { href: "/inspections", label: "Inspeções", icon: Search },
  { href: "/reports", label: "Relatórios", icon: FileText }, // Nova entrada
  { href: "/templates", label: "Templates", icon: CircleDot },
  { href: "/inspectors", label: "Lincers", icon: Users },
  { href: "/clients", label: "Clientes", icon: Building2 },
  { href: "/chats", label: "Chats", icon: MessageSquare },
  { href: "/settings", label: "Configurações", icon: Settings },
];

// Main navigation component for desktop
export function Sidebar({ onToggle, isCollapsed }) {
  const pathname = usePathname();
  const { navigateTo } = useNavigation();
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
    navigateTo('/inspections/create');
  };

  const handleNewTemplate = () => {
    navigateTo('/templates/new/editor');
  };

  const handleNewProject = () => {
    navigateTo('/projects/create');
  };

  return (
    <aside
      className={`hidden md:flex h-screen fixed left-0 top-0 z-40 flex-col bg-background border-r transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
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
            <ChevronRight className="h-6 w-6" />
          ) : (
            <ChevronLeft className="h-6 w-6" />
          )}
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            if (item.href === "/chats") {
              const chatLink = (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    pathname === item.href || pathname.startsWith(`${item.href}/`)
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  } ${isCollapsed ? "justify-center" : ""}`}
                >
                  <div className="relative">
                    <MessageSquare className="h-6 w-6 flex-shrink-0" />
                    {isCollapsed && totalUnread > 0 && (
                      <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center">
                        {totalUnread > 9 ? '9+' : totalUnread}
                      </span>
                    )}
                  </div>
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
              );
              
              return (
                <li key={item.href}>
                  {isCollapsed ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {chatLink}
                        </TooltipTrigger>
                        <TooltipContent side="right" className="ml-2">
                          <p>{item.label}{totalUnread > 0 && ` (${totalUnread})`}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    chatLink
                  )}
                </li>
              );
            }
            const menuLink = (
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                } ${isCollapsed ? "justify-center" : ""}`}
              >
                <item.icon className="h-6 w-6 flex-shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
            
            return (
              <li key={item.href}>
                {isCollapsed ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {menuLink}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="ml-2">
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  menuLink
                )}
              </li>
            );
          })}
        </ul>
        
        <Separator className="my-4" />
        
        <div className="px-3 py-2 space-y-2">
          {isCollapsed ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-center w-9 px-0"
                    onClick={handleNewInspection}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2">
                  <p>Nova Inspeção</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={handleNewInspection}
            >
              <Plus className="h-5 w-5 mr-2" />
              <span className="truncate">Nova Inspeção</span>
            </Button>
          )}
          
          {isCollapsed ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-center w-9 px-0"
                    onClick={handleNewTemplate}
                  >
                    <CircleDot className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2">
                  <p>Novo Template</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={handleNewTemplate}
            >
              <CircleDot className="h-5 w-5 mr-2" />
              <span className="truncate">Novo Template</span>
            </Button>
          )}
          
          {isCollapsed ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-center w-9 px-0"
                    onClick={handleNewProject}
                  >
                    <FolderKanban className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2">
                  <p>Novo Projeto</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={handleNewProject}
            >
              <FolderKanban className="h-5 w-5 mr-2" />
              <span className="truncate">Novo Projeto</span>
            </Button>
          )}
        </div>
      </nav>
      <div className="p-4 border-t space-y-2">
        {isCollapsed ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-center w-9 px-0"
                  onClick={toggleTheme}
                >
                  {theme === "dark" ? (
                    <Moon className="h-5 w-5" />
                  ) : (
                    <Sun className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="ml-2">
                <p>Trocar tema</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={toggleTheme}
          >
            {theme === "dark" ? (
              <Moon className="h-5 w-5 mr-2" />
            ) : (
              <Sun className="h-5 w-5 mr-2" />
            )}
            <span className="truncate">Trocar tema</span>
          </Button>
        )}
        
        {isCollapsed ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="justify-center w-9 px-0"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="ml-2">
                <p>Sair</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-2" />
            <span className="truncate">Sair</span>
          </Button>
        )}
      </div>
    </aside>
  );
}

// Mobile navigation component
export function MobileNav() {
  const pathname = usePathname();
  const { navigateTo } = useNavigation();
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
    navigateTo('/inspections/create');
  };

  const handleNewTemplate = () => {
    navigateTo('/templates/new/editor');
  };

  const handleNewProject = () => {
    navigateTo('/projects/create');
  };

  return (
    <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-background px-4 lg:px-6 md:hidden sticky top-0 z-40">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden">
            <Menu className="h-6 w-6" />
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
                    <item.icon className="h-6 w-6 flex-shrink-0" />
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
                <Plus className="mr-2 h-5 w-5" />
                <span className="truncate">Nova Inspeção</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleNewTemplate}
              >
                <CircleDot className="mr-2 h-5 w-5" />
                <span className="truncate">Novo Template</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleNewProject}
              >
                <FolderKanban className="mr-2 h-5 w-5" />
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
                  <Moon className="mr-2 h-5 w-5" />
                ) : (
                  <Sun className="mr-2 h-5 w-5" />
                )}
                <span>Trocar tema</span>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="w-full justify-start"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-5 w-5" />
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