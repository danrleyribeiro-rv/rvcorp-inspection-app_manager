// components/projects/components/TableView.js
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Trash2, Shield } from "lucide-react";
import { useState } from "react";
import { useNavigation } from "@/hooks/use-navigation";
import DeleteProjectDialog from "./DeleteProjectDialog.js";
import GrantAccessDialog from "./GrantAccessDialog";
import { Skeleton } from "@/components/ui/skeleton";

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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-8 w-24" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum projeto encontrado
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">
                    <button
                      onClick={() => navigateTo(`/projects/${project.id}`)}
                      className="text-left hover:text-primary hover:underline transition-colors"
                    >
                      {project.title}
                    </button>
                  </TableCell>
                  <TableCell>{project.clients?.name || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{project.type || 'N/A'}</TableCell>
                  <TableCell>{formatCurrency(project.project_price)}</TableCell>
                  <TableCell className="flex gap-2">
                    <EnhancedButton 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setGrantingAccessProject(project)}
                      title="Gerenciar acesso"
                    >
                      <Shield className="h-4 w-4 text-blue-600" />
                    </EnhancedButton>
                    <EnhancedButton 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setDeletingProject(project)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </EnhancedButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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