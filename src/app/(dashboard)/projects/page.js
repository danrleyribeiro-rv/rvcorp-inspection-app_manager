// app/(dashboard)/projects/page.js
"use client"

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Plus } from "lucide-react";
import TableView from "./components/TableView";
import KanbanView from "./components/KanbanView";
import { CreateProjectDialog } from "./components/CreateProjectDialog";
import { ResponsiveContainer } from "@/components/ui/responsive-container";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";


export default function ProjectsPage() {
  const [activeView, setActiveView] = useState("lista");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
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
      if (!user?.uid) return;
      
      const userSettingsRef = doc(db, 'user_settings', user.uid);
      const settingsDoc = await getDoc(userSettingsRef);
      
      if (settingsDoc.exists() && settingsDoc.data()?.settings?.app?.defaultView) {
        setActiveView(settingsDoc.data().settings.app.defaultView);
      }
    } catch (error) {
      console.error("Error loading default view:", error);
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      if (!user?.uid) {
        throw new Error("User not authenticated");
      }

      // Fetch projects for this manager
      const projectsQuery = query(
        collection(db, 'projects'),
        where('manager_id', '==', user.uid),
        where('deleted_at', '==', null),
        orderBy('created_at', 'desc')
      );
      
      const projectsSnapshot = await getDocs(projectsQuery);
      const projectsList = [];
      
      // For each project, fetch client data
      for (const projectDoc of projectsSnapshot.docs) {
        const projectData = {
          id: projectDoc.id,
          ...projectDoc.data(),
          // Convert Firebase timestamps to ISO strings for easier handling
          created_at: projectDoc.data().created_at?.toDate().toISOString(),
          updated_at: projectDoc.data().updated_at?.toDate().toISOString()
        };
        
        // Fetch client data if client_id exists
        if (projectData.client_id) {
          try {
            const clientRef = doc(db, 'clients', projectData.client_id);
            const clientDoc = await getDoc(clientRef);
            
            if (clientDoc.exists()) {
              projectData.clients = {
                id: clientDoc.id,
                ...clientDoc.data()
              };
            }
          } catch (err) {
            console.error("Error fetching client data:", err);
          }
        }
        
        projectsList.push(projectData);
      }
      
      setProjects(projectsList);
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
    <ResponsiveContainer>
      <div className="container p-6 animate-in fade-in-0 duration-300">
      <div className="flex justify-between items-center mb-6 animate-in slide-in-from-top-4 duration-500">
        <h1 className="text-3xl font-bold animate-in slide-in-from-left-4 duration-700">Projetos</h1>
        <EnhancedButton onClick={() => router.push('/projects/create')} className="flex-1 sm:flex-none">
          <Plus className="mr-2 h-4 w-4" />
          Novo Projeto
        </EnhancedButton>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView} className="space-y-4 animate-in slide-in-from-bottom-4 duration-500 delay-200">
        <TabsList>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="animate-in fade-in-0 duration-300">
          <TableView projects={projects} isLoading={loading} onRefresh={fetchProjects} />
        </TabsContent>

        <TabsContent value="kanban" className="animate-in fade-in-0 duration-300">
          <KanbanView projects={projects} isLoading={loading} onRefresh={fetchProjects} />
        </TabsContent>
      </Tabs>

      {showCreateModal && (
        <CreateProjectDialog
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchProjects}
          managerId={user.uid}
        />
      )}
      </div>
    </ResponsiveContainer>
  );
}