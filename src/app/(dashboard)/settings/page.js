// src/app/(dashboard)/settings/page.js
"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useTheme } from "next-themes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
    Bell,
    Settings as SettingsIcon,
    Palette,
    Mail,
    MessageSquare,
    ClipboardList,
    Search,
    Moon,
    Sun,
  } from "lucide-react";
  
  const defaultSettings = {
    notifications: {
      email: true,
      push: true,
      chat: true,
      orders: true,
      inspections: true,
    },
    app: {
      dateFormat: "DD/MM/YYYY",
      autoSave: true,
      defaultView: "lista",
    },
    theme: "light"
  };
  
  export default function SettingsPage() {
    const [settings, setSettings] = useState(defaultSettings);
    const [loading, setLoading] = useState(true);
    const { theme, setTheme } = useTheme();
  
    useEffect(() => {
      loadSettings();
    }, []);
  
    const loadSettings = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists() && userDoc.data().settings) {
          const userSettings = userDoc.data().settings;
          setSettings(userSettings);
          setTheme(userSettings.theme);
        }
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
        toast({
          title: "Erro",
          description: "Falha ao carregar configurações",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
  
    const saveSettings = async (newSettings) => {
      try {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          settings: newSettings,
        });
        toast({
          title: "Sucesso",
          description: "Configurações salvas com sucesso",
        });
      } catch (error) {
        console.error("Erro ao salvar configurações:", error);
        toast({
          title: "Erro",
          description: "Falha ao salvar configurações",
          variant: "destructive",
        });
      }
    };
  
    const updateNotificationSetting = (key) => {
      const newSettings = {
        ...settings,
        notifications: {
          ...settings.notifications,
          [key]: !settings.notifications[key],
        },
      };
      setSettings(newSettings);
      saveSettings(newSettings);
    };
  
    const updateAppSetting = (key, value) => {
      const newSettings = {
        ...settings,
        app: {
          ...settings.app,
          [key]: value,
        },
      };
      setSettings(newSettings);
      saveSettings(newSettings);
    };
  
    const updateTheme = (newTheme) => {
      setTheme(newTheme);
      const newSettings = {
        ...settings,
        theme: newTheme,
      };
      setSettings(newSettings);
      saveSettings(newSettings);
    };
  
    if (loading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }
  
    return (
      <div className="container max-w-4x1 p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Configurações</h1>
        </div>
  
        <Tabs defaultValue="notifications" className="space-y-4">
          <TabsList>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="app" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              Aplicação
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Aparência
            </TabsTrigger>
          </TabsList>
  
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Preferências de Notificação</CardTitle>
                <CardDescription>
                  Configure como deseja receber as notificações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <Label>Notificações por E-mail</Label>
                  </div>
                  <Switch 
                    checked={settings.notifications.email}
                    onCheckedChange={() => updateNotificationSetting("email")}
                  />
                </div>
  
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <Label>Notificações de Chat</Label>
                  </div>
                  <Switch 
                    checked={settings.notifications.chat}
                    onCheckedChange={() => updateNotificationSetting("chat")}
                  />
                </div>
  
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    <Label>Atualizações de Pedidos</Label>
                  </div>
                  <Switch 
                    checked={settings.notifications.orders}
                    onCheckedChange={() => updateNotificationSetting("orders")}
                  />
                </div>
  
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    <Label>Atualizações de Inspeções</Label>
                  </div>
                  <Switch 
                    checked={settings.notifications.inspections}
                    onCheckedChange={() => updateNotificationSetting("inspections")}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
  
          <TabsContent value="app">
            <Card>
              <CardHeader>
                <CardTitle>Configurações da Aplicação</CardTitle>
                <CardDescription>
                  Personalize suas preferências de aplicação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Formato de Data</Label>
                  <select
                    className="w-full p-2 border rounded-md bg-background"
                    value={settings.app.dateFormat}
                    onChange={(e) => updateAppSetting("dateFormat", e.target.value)}
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
  
                <div className="flex items-center justify-between">
                  <Label>Auto-salvamento</Label>
                  <Switch 
                    checked={settings.app.autoSave}
                    onCheckedChange={(checked) => updateAppSetting("autoSave", checked)}
                  />
                </div>
  
                <div className="space-y-2">
                  <Label>Visualização Padrão</Label>
                  <select
                    className="w-full p-2 border rounded-md bg-background"
                    value={settings.app.defaultView}
                    onChange={(e) => updateAppSetting("defaultView", e.target.value)}
                  >
                    <option value="lista">Lista</option>
                    <option value="grade">Grade</option>
                    <option value="kanban">Kanban</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
  
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Aparência</CardTitle>
                <CardDescription>
                  Personalize a aparência da aplicação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {theme === "dark" ? (
                      <Moon className="h-4 w-4" />
                    ) : (
                      <Sun className="h-4 w-4" />
                    )}
                    <Label>Modo Escuro</Label>
                  </div>
                  <Switch 
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => updateTheme(checked ? "dark" : "light")}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }