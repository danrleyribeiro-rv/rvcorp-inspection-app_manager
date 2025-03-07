
// components/projects/components/KanbanView.js
"use client";

import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Edit, Trash2, Eye } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import EditProjectDialog from "./EditProjectDialog";
import DeleteProjectDialog from "./DeleteProjectDialog";
import ViewProjectDialog from "./ViewProjectDialog";
import { Skeleton } from "@/components/ui/skeleton";

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
};

export default function KanbanView({ projects, isLoading, onRefresh }) {
  const [editingProject, setEditingProject] = useState(null);
  const [deletingProject, setDeletingProject] = useState(null);
  const [viewingProject, setViewingProject] = useState(null);
  const { toast } = useToast();

  // Organize projects by status
  const columns = {
    "Aguardando": { 
      id: "Aguardando", 
      title: "Aguardando", 
      projects: projects.filter(p => p.status === "Aguardando"),
      color: "bg-yellow-50 border-yellow-200"
    },
    "Em Andamento": { 
      id: "Em Andamento", 
      title: "Em Andamento", 
      projects: projects.filter(p => p.status === "Em Andamento"),
      color: "bg-blue-50 border-blue-200"
    },
    "Em Revisão": { 
      id: "Em Revisão", 
      title: "Em Revisão", 
      projects: projects.filter(p => p.status === "Em Revisão"),
      color: "bg-purple-50 border-purple-200"
    },
    "Concluído": { 
      id: "Concluído", 
      title: "Concluído", 
      projects: projects.filter(p => p.status === "Concluído"),
      color: "bg-green-50 border-green-200"
    }
  };

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    // Dropped outside the list
    if (!destination) return;
    
    // Dropped in the same column
    if (source.droppableId === destination.droppableId) return;

    try {
      // Update project status
      const { error } = await supabase
        .from('projects')
        .update({
          status: destination.droppableId,
          updated_at: new Date()
        })
        .eq('id', draggableId);

      if (error) throw error;
      
      toast({
        title: "Status atualizado com sucesso"
      });
      
      onRefresh();
    } catch (error) {
      console.error("Error updating project status:", error);
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.values(columns).map((column) => (
          <div key={column.id} className={`p-4 rounded-md border ${column.color}`}>
            <h3 className="font-medium mb-4">{column.title}</h3>
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <Card key={i} className="bg-white">
                  <CardHeader className="p-3">
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <Skeleton className="h-3 w-24 mb-2" />
                    <Skeleton className="h-3 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(columns).map((column) => (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided) => (
                <div 
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`p-4 rounded-md border ${column.color}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">{column.title}</h3>
                    <Badge variant="outline">{column.projects.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {column.projects.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        Nenhum projeto nesta categoria
                      </p>
                    ) : (
                      column.projects.map((project, index) => (
                        <Draggable 
                          key={project.id} 
                          draggableId={project.id} 
                          index={index}
                        >
                          {(provided) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="bg-white"
                            >
                              <CardHeader className="p-3 pb-1">
                                <CardTitle className="text-sm font-medium">{project.title}</CardTitle>
                              </CardHeader>
                              <CardContent className="p-3 pt-0 space-y-2">
                                <p className="text-xs text-muted-foreground">
                                  Cliente: {project.clients?.name || 'N/A'}
                                </p>
                                <p className="text-xs font-medium">
                                  {formatCurrency(project.project_price)}
                                </p>
                                {project.inspection_date && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <CalendarIcon className="h-3 w-3" />
                                    <span>
                                      {format(new Date(project.inspection_date), "dd/MM/yyyy", { locale: ptBR })}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-end gap-1 pt-1">
                                  <button 
                                    onClick={() => setViewingProject(project)}
                                    className="text-xs p-1 rounded-sm hover:bg-gray-100"
                                  >
                                    <Eye className="h-3 w-3" />
                                  </button>
                                  <button 
                                    onClick={() => setEditingProject(project)}
                                    className="text-xs p-1 rounded-sm hover:bg-gray-100"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </button>
                                  <button 
                                    onClick={() => setDeletingProject(project)}
                                    className="text-xs p-1 rounded-sm hover:bg-gray-100"
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </button>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {editingProject && (
        <EditProjectDialog
          project={editingProject}
          open={!!editingProject}
          onClose={() => setEditingProject(null)}
          onSuccess={onRefresh}
        />
      )}

      {deletingProject && (
        <DeleteProjectDialog
          project={deletingProject}
          open={!!deletingProject}
          onClose={() => setDeletingProject(null)}
          onSuccess={onRefresh}
        />
      )}

      {viewingProject && (
        <ViewProjectDialog
          project={viewingProject}
          open={!!viewingProject}
          onClose={() => setViewingProject(null)}
        />
      )}
    </>
  );
}
