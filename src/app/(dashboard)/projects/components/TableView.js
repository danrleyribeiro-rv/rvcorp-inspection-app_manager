// components/projects/components/TableView.js
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Trash2, Shield, Building, DollarSign, Calendar, User, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useNavigation } from "@/hooks/use-navigation";
import DeleteProjectDialog from "./DeleteProjectDialog.js";
import GrantAccessDialog from "./GrantAccessDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const getStatusColor = (status) => {
  const statusColors = {
    "Aguardando": "yellow",
    "Em Andamento": "blue",
    "Em Revisão": "purple",
    "Concluído": "green"
  };
  return statusColors[status] || "gray";
};

export default function TableView({ projects, isLoading, onRefresh }) {
  const { navigateTo } = useNavigation();
  const [deletingProject, setDeletingProject] = useState(null);
  const [grantingAccessProject, setGrantingAccessProject] = useState(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-3">
              <div className="flex gap-2 w-full">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-9 w-9" />
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return 'N/A';
    }
  };

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Building className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">Nenhum projeto encontrado</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Crie seu primeiro projeto para começar a gerenciar suas inspeções.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="hover:shadow-lg transition-all duration-200 group cursor-pointer"
                onClick={() => navigateTo(`/projects/${project.id}`)}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                    {project.title}
                    <ExternalLink className="h-4 w-4 inline ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">
                    {project.description || 'Sem descrição disponível'}
                  </CardDescription>
                </div>
                <Badge variant={getStatusColor(project.status)} className="ml-2 flex-shrink-0">
                  {project.status || 'N/A'}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{project.clients?.name || 'Cliente não definido'}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{project.type || 'Tipo não definido'}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span>{formatDate(project.created_at)}</span>
              </div>
              
              {project.project_price && (
                <div className="flex items-center gap-2 text-sm font-medium">
                  <DollarSign className="h-4 w-4 flex-shrink-0 text-green-600" />
                  <span className="text-green-600">{formatCurrency(project.project_price)}</span>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="pt-3 border-t bg-muted/20">
              <div className="flex gap-2 w-full">
                <EnhancedButton 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateTo(`/projects/${project.id}`);
                  }}
                >
                  Ver Detalhes
                </EnhancedButton>
                
                <EnhancedButton 
                  variant="ghost" 
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setGrantingAccessProject(project);
                  }}
                  title="Gerenciar acesso"
                >
                  <Shield className="h-4 w-4 text-blue-600" />
                </EnhancedButton>
                
                <EnhancedButton 
                  variant="ghost" 
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingProject(project);
                  }}
                  title="Excluir projeto"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </EnhancedButton>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

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