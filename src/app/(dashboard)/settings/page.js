// src/app/(dashboard)/settings/page.js
"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, auth, storage } from "@/lib/firebase";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
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
import ProfileSection from "./components/ProfileSection";

const defaultSettings = {
  notifications: {
    email: true,
    push: true,
    
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
  const [password, setPassword] = useState({
    current: "",
    new: "",
    confirm: ""
  });
  const [loading, setLoading] = useState({
    settings: true,
    password: false
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      if (!user?.uid) return;
      
      const userSettingsRef = doc(db, 'user_settings', user.uid);
      const settingsDoc = await getDoc(userSettingsRef);
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setSettings({ ...defaultSettings, ...data.settings });
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    } finally {
      setLoading(prev => ({ ...prev, settings: false }));
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      if (!user?.uid) return;
      
      const userSettingsRef = doc(db, 'user_settings', user.uid);
      await setDoc(userSettingsRef, {
        settings: newSettings,
        updated_at: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações",
        variant: "destructive",
      });
    }
  };

  const handleNotificationChange = (key) => {
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

  const handleAppSettingChange = (key, value) => {
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

  const handleChangePassword = async (e) => {
    e.preventDefault();

    // Validar senhas
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

    if (password.current.length === 0) {
      toast({
        title: "Erro",
        description: "Digite sua senha atual",
        variant: "destructive",
      });
      return;
    }

    setLoading(prev => ({ ...prev, password: true }));

    try {
      if (!auth.currentUser) {
        throw new Error("Usuário não autenticado");
      }

      // Criar credencial para reautenticação
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        password.current
      );

      // Reautenticar o usuário
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Agora atualizar a senha
      await updatePassword(auth.currentUser, password.new);

      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso",
      });

      // Limpar formulário
      setPassword({
        current: "",
        new: "",
        confirm: ""
      });
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      let errorMessage = "Falha ao alterar senha";
      
      // Mensagens de erro específicas do Firebase Auth
      if (error.code === 'auth/wrong-password') {
        errorMessage = "Senha atual incorreta";
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = "Senha atual incorreta";
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = "Por motivos de segurança, faça login novamente antes de alterar sua senha";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "A senha é muito fraca. Use uma senha mais forte";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Muitas tentativas. Tente novamente mais tarde";
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
          <ProfileSection />
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Notificação</CardTitle>
              <CardDescription>
                Configure como deseja receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <Label>Notificações por Email</Label>
                </div>
                <Switch
                  checked={settings.notifications.email}
                  onCheckedChange={() => handleNotificationChange("email")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="h-4 w-4" />
                  <Label>Notificações Push</Label>
                </div>
                <Switch
                  checked={settings.notifications.push}
                  onCheckedChange={() => handleNotificationChange("push")}
                />
              </div>

              

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ClipboardList className="h-4 w-4" />
                  <Label>Inspeções</Label>
                </div>
                <Switch
                  checked={settings.notifications.inspections}
                  onCheckedChange={() => handleNotificationChange("inspections")}
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
                Personalize o comportamento da aplicação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Formato de Data</Label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={settings.app.dateFormat}
                  onChange={(e) => handleAppSettingChange("dateFormat", e.target.value)}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Visualização Padrão</Label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={settings.app.defaultView}
                  onChange={(e) => handleAppSettingChange("defaultView", e.target.value)}
                >
                  <option value="lista">Lista</option>
                  <option value="kanban">Kanban</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4" />
                  <Label>Auto-salvamento</Label>
                </div>
                <Switch
                  checked={settings.app.autoSave}
                  onCheckedChange={(checked) => handleAppSettingChange("autoSave", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
              <CardDescription>
                Personalize a aparência da aplicação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
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
                    disabled={loading.password}
                    placeholder="Digite sua senha atual"
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
                    disabled={loading.password}
                    placeholder="Digite sua nova senha (mín. 8 caracteres)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={password.confirm}
                    onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                    required
                    disabled={loading.password}
                    placeholder="Confirme sua nova senha"
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