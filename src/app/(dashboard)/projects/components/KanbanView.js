// components/projects/components/KanbanView.js
"use client";

import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { CalendarIcon, Trash2, Building2, DollarSign, User, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigation } from "@/hooks/use-navigation";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DeleteProjectDialog from "./DeleteProjectDialog";
import GrantAccessDialog from "./GrantAccessDialog";
import { Skeleton } from "@/components/ui/skeleton";

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
};

export default function KanbanView({ projects, isLoading, onRefresh }) {
  const { navigateTo } = useNavigation();
  const [deletingProject, setDeletingProject] = useState(null);
  const [grantingAccessProject, setGrantingAccessProject] = useState(null);
  const [localProjects, setLocalProjects] = useState(projects);
  const { toast } = useToast();

  // Sincroniza localProjects quando projects muda
  useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  // Organize projects by status
  const columns = {
    "Aguardando": { 
      id: "Aguardando", 
      title: "Aguardando", 
      projects: localProjects.filter(p => p.status === "Aguardando"),
      color: "bg-amber-50 border-amber-200 shadow-sm"
    },
    "Em Andamento": { 
      id: "Em Andamento", 
      title: "Em Andamento", 
      projects: localProjects.filter(p => p.status === "Em Andamento"),
      color: "bg-blue-50 border-blue-200 shadow-sm"
    },
    "Em Revisão": { 
      id: "Em Revisão", 
      title: "Em Revisão", 
      projects: localProjects.filter(p => p.status === "Em Revisão"),
      color: "bg-purple-50 border-purple-200 shadow-sm"
    },
    "Concluído": { 
      id: "Concluído", 
      title: "Concluído", 
      projects: localProjects.filter(p => p.status === "Concluído"),
      color: "bg-emerald-50 border-emerald-200 shadow-sm"
    }
  };

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    // Dropped outside the list
    if (!destination) return;
    
    // Dropped in the same column
    if (source.droppableId === destination.droppableId) return;

    // Atualização otimista
    const prevProjects = [...localProjects];
    setLocalProjects(projects =>
      projects.map(p =>
        p.id === draggableId ? { ...p, status: destination.droppableId } : p
      )
    );

    try {
      // Update project status in Firestore
      const projectRef = doc(db, 'projects', draggableId);
      
      await updateDoc(projectRef, {
        status: destination.droppableId,
        updated_at: serverTimestamp()
      });
      
      toast({
        title: "Status atualizado com sucesso"
      });
      
    } catch (error) {
      // Reverte se falhar
      setLocalProjects(prevProjects);
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
                    <h3 className="font-semibold text-gray-800">{column.title}</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {column.projects.length} projeto{column.projects.length !== 1 ? 's' : ''}
                      </Badge>
                      <div className="w-3 h-3 rounded-full opacity-60" style={{
                        backgroundColor: column.id === 'Aguardando' ? '#f59e0b' :
                                       column.id === 'Em Andamento' ? '#3b82f6' :
                                       column.id === 'Em Revisão' ? '#8b5cf6' : '#10b981'
                      }} />
                    </div>
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
                              className="bg-white hover:shadow-md transition-shadow cursor-pointer group"
                              onClick={(e) => {
                                // Prevent opening modal when clicking action buttons
                                if (!e.target.closest('button')) {
                                  navigateTo(`/projects/${project.id}`);
                                }
                              }}
                            >
                              <CardHeader className="p-4 pb-2">
                                <div className="flex items-start justify-between">
                                  <CardTitle className="text-sm font-semibold leading-tight line-clamp-2">
                                    {project.title}
                                  </CardTitle>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <EnhancedButton 
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setGrantingAccessProject(project);
                                      }}
                                      className="h-7 w-7 text-xs"
                                      title="Gerenciar acesso"
                                    >
                                      <Shield className="h-3 w-3 text-blue-600" />
                                    </EnhancedButton>
                                    <EnhancedButton 
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingProject(project);
                                      }}
                                      className="h-7 w-7 text-xs"
                                      title="Excluir projeto"
                                    >
                                      <Trash2 className="h-3 w-3 text-red-600" />
                                    </EnhancedButton>
                                  </div>
                                </div>
                                {project.type && (
                                  <Badge variant="outline" className="text-xs w-fit">
                                    {project.type}
                                  </Badge>
                                )}
                              </CardHeader>
                              <CardContent className="p-4 pt-0 space-y-3">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <User className="h-3 w-3" />
                                    <span className="truncate">{project.clients?.name || 'Cliente não informado'}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 text-xs font-medium text-green-700">
                                    <DollarSign className="h-3 w-3" />
                                    <span>{formatCurrency(project.project_price)}</span>
                                  </div>
                                  
                                  {project.inspection_date && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <CalendarIcon className="h-3 w-3" />
                                      <span>
                                        {format(new Date(project.inspection_date), "dd/MM/yyyy", { locale: ptBR })}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {project.location && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Building2 className="h-3 w-3" />
                                      <span className="truncate">{project.location}</span>
                                    </div>
                                  )}
                                </div>
                                
                                {project.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                                    {project.description}
                                  </p>
                                )}
                                
                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                  <span className="text-xs text-muted-foreground">
                                    Clique para abrir projeto
                                  </span>
                                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" title="Clique para abrir" />
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

      {deletingProject && (
        <DeleteProjectDialog
          project={deletingProject}
          open={!!deletingProject}
          onClose={() => setDeletingProject(null)}
          onSuccess={onRefresh}
        />
      )}

      {grantingAccessProject && (
        <GrantAccessDialog
          project={grantingAccessProject}
          open={!!grantingAccessProject}
          onClose={() => setGrantingAccessProject(null)}
          onAccessGranted={onRefresh}
        />
      )}
    </>
  );
}