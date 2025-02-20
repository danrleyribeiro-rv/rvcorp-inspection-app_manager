// src/app/(dashboard)/projects/page.js
"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import TableView from "./components/TableView";
import KanbanView from "./components/KanbanView";
import CalendarView from "./components/CalendarView";
import CreateProjectDialog from "./components/CreateProjectDialog";

export default function ProjectsPage() {
  const [activeView, setActiveView] = useState("lista");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadDefaultView();
  }, []);

  const loadDefaultView = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists() && userDoc.data().settings?.app?.defaultView) {
        setActiveView(userDoc.data().settings.app.defaultView);
      }
    } catch (error) {
      console.error("Error loading default view:", error);
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
          <TableView />
        </TabsContent>

        <TabsContent value="kanban">
          <KanbanView />
        </TabsContent>

        <TabsContent value="calendario">
          <CalendarView />
        </TabsContent>
      </Tabs>

      {showCreateModal && (
        <CreateProjectDialog
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}