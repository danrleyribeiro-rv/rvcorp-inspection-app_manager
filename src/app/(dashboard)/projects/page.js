// app/(dashboard)/projects/page.js
"use client"

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import TableView from "./components/TableView";
import KanbanView from "./components/KanbanView";
import CalendarView from "./components/CalendarView";
import { CreateProjectDialog } from "./components/CreateProjectDialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

export default function ProjectsPage() {
  const [activeView, setActiveView] = useState("lista");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchProjects();
      loadDefaultView();
    }
  }, [user]);

  const loadDefaultView = async () => {
    try {
      const { data: userData, error } = await supabase
        .from('user_settings') // Use the correct table: user_settings
        .select('settings')
        .eq('user_id', user.id) // Use the correct column name: user_id
        .single();

      if (!error && userData?.settings?.app?.defaultView) {
        setActiveView(userData.settings.app.defaultView);
      } else if (error && error.code !== 'PGRST116'){
          console.error("Error loading default view:", error);
      }
    } catch (error) {
      console.error("Error loading default view:", error);
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      // Check if the user is a manager
      const { data: managerData, error: managerError } = await supabase
        .from('managers')
        .select('id')
        .eq('id', user.id)
        .single();

      if (managerError && managerError.code !== 'PGRST116') {
        throw managerError;
      }

      // If manager, get projects assigned to this manager
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          title,
          description,
          type,
          project_price,
          status,
          manager_id,
          client_id,
          created_at,
          updated_at,
          clients:client_id (name)
        `)
        .eq('manager_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast({
        title: "Erro ao carregar projetos",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Projetos</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Projeto
        </Button>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView} className="space-y-4">
        <TabsList>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="calendario">Calendário</TabsTrigger>
        </TabsList>

        <TabsContent value="lista">
          <TableView projects={projects} isLoading={loading} onRefresh={fetchProjects} />
        </TabsContent>

        <TabsContent value="kanban">
          <KanbanView projects={projects} isLoading={loading} onRefresh={fetchProjects} />
        </TabsContent>

        <TabsContent value="calendario">
          <CalendarView projects={projects} isLoading={loading} onRefresh={fetchProjects} />
        </TabsContent>
      </Tabs>

      {showCreateModal && (
        <CreateProjectDialog
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchProjects}
          managerId={user.id}
        />
      )}
    </div>
  );
}