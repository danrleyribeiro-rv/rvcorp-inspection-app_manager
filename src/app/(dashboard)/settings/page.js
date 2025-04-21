// app/(dashboard)/settings/page.js
"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { updatePassword } from "firebase/auth";
import { useTheme } from "next-themes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
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
  User,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [profile, setProfile] = useState({
    name: "",
    surname: "",
    email: ""
  });
  const [password, setPassword] = useState({
    current: "",
    new: "",
    confirm: ""
  });
  const [loading, setLoading] = useState({
    settings: true,
    profile: false,
    password: false
  });
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadSettings();
      loadProfile();
    }
  }, [user]);

  const loadSettings = async () => {
    setLoading(prev => ({ ...prev, settings: true }));
    try {
      if (!user?.uid) return;
      
      const userSettingsRef = doc(db, 'user_settings', user.uid);
      const settingsDoc = await getDoc(userSettingsRef);
      
      if (settingsDoc.exists()) {
        const settingsData = settingsDoc.data();
        if (settingsData.settings) {
          setSettings(settingsData.settings);
          
          // Apply theme from settings if it exists
          if (settingsData.settings.theme) {
            setTheme(settingsData.settings.theme);
          }
        } else {
          // If settings object doesn't exist in the document
          setSettings(defaultSettings);
        }
      } else {
        // If document doesn't exist yet, use defaults
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar configurações",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, settings: false }));
    }
  };

  const loadProfile = async () => {
    try {
      if (!user?.uid) return;
      
      const managerRef = doc(db, 'managers', user.uid);
      const managerDoc = await getDoc(managerRef);
      
      if (managerDoc.exists()) {
        const data = managerDoc.data();
        setProfile({
          name: data.name || "",
          surname: data.surname || "",
          email: user.email || data.email || ""
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar informações do perfil",
        variant: "destructive",
      });
    }
  };

  const saveSettings = async (newSettings) => {
    setLoading(prev => ({ ...prev, settings: true }));
    try {
      if (!user?.uid) return;
      
      const userSettingsRef = doc(db, 'user_settings', user.uid);
      
      // Check if the document already exists
      const docSnap = await getDoc(userSettingsRef);
      
      if (docSnap.exists()) {
        // Update existing document
        await updateDoc(userSettingsRef, {
          settings: newSettings,
          updated_at: serverTimestamp()
        });
      } else {
        // Create new document
        await setDoc(userSettingsRef, {
          settings: newSettings,
          user_id: user.uid,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
      }

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, settings: false }));
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

  const updateThemeSetting = (newTheme) => {
    setTheme(newTheme);
    const newSettings = {
      ...settings,
      theme: newTheme,
    };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(prev => ({ ...prev, profile: true }));

    try {
      if (!user?.uid) return;
      
      const managerRef = doc(db, 'managers', user.uid);
      
      await updateDoc(managerRef, {
        name: profile.name,
        surname: profile.surname,
        updated_at: serverTimestamp()
      });

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar perfil",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    // Validate passwords
    if (password.new !== password.confirm) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    if (password.new.length < 8) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 8 caracteres",
        variant: "destructive",
      });
      return;
    }

    setLoading(prev => ({ ...prev, password: true }));

    try {
      if (!auth.currentUser) {
        throw new Error("Usuário não autenticado");
      }
      
      // Use Firebase Auth to update password
      await updatePassword(auth.currentUser, password.new);

      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso",
      });

      // Clear form
      setPassword({
        current: "",
        new: "",
        confirm: ""
      });
    } catch (error) {
      console.error("Error changing password:", error);
      let errorMessage = "Falha ao alterar senha";
      
      // Provide more specific error messages for Firebase Auth errors
      if (error.code === 'auth/requires-recent-login') {
        errorMessage = "Por motivos de segurança, faça login novamente antes de alterar sua senha";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "A senha é muito fraca. Use uma senha mais forte";
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, password: false }));
    }
  };

  if (loading.settings) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Configurações</h1>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
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
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Segurança
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>
                Atualize suas informações pessoais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="surname">Sobrenome</Label>
                    <Input
                      id="surname"
                      value={profile.surname}
                      onChange={(e) => setProfile({ ...profile, surname: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">O email não pode ser alterado.</p>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={loading.profile}>
                    {loading.profile ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

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
                  <option value="kanban">Kanban</option>
                  <option value="calendario">Calendário</option>
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
                  onCheckedChange={(checked) => updateThemeSetting(checked ? "dark" : "light")}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>
                Atualize sua senha de acesso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Senha Atual</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={password.current}
                    onChange={(e) => setPassword({ ...password, current: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={password.new}
                    onChange={(e) => setPassword({ ...password, new: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={password.confirm}
                    onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loading.password}>
                    {loading.password ? "Alterando..." : "Alterar Senha"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}