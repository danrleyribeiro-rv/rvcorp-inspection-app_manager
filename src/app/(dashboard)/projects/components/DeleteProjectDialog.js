// components/projects/components/DeleteProjectDialog.js
"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { AlertTriangle, Trash2, FileText, Users, Calendar } from "lucide-react"
import { getInternalStatus } from "@/utils/inspection-status"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function DeleteProjectDialog({ project, open, onClose, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false)
  const [projectStats, setProjectStats] = useState({
    inspections: 0,
    completedInspections: 0,
    pendingInspections: 0
  })
  const [loadingStats, setLoadingStats] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open && project) {
      fetchProjectStats()
    }
  }, [open, project])

  const fetchProjectStats = async () => {
    setLoadingStats(true)
    try {
      const inspectionsQuery = query(
        collection(db, 'inspections'),
        where('project_id', '==', project.id),
        where('deleted_at', '==', null)
      )
      
      const inspectionsSnapshot = await getDocs(inspectionsQuery)
      const inspections = inspectionsSnapshot.docs.map(doc => doc.data())
      
      const deliveredInspections = inspections.filter(i => getInternalStatus(i) === 'entregue').length
      const pendingInspections = inspections.filter(i => getInternalStatus(i) === 'pendente').length
      const editedInspections = inspections.filter(i => getInternalStatus(i) === 'editada').length
      
      setProjectStats({
        inspections: inspections.length,
        deliveredInspections,
        pendingInspections,
        editedInspections
      })
    } catch (error) {
      console.error('Error fetching project stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    
    try {
      // Soft delete by setting deleted_at
      const projectRef = doc(db, 'projects', project.id);
      
      await updateDoc(projectRef, {
        deleted_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      
      toast({
        title: "Projeto excluído com sucesso"
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "Erro ao excluir projeto",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (!project) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-full">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-xl">Excluir Projeto</DialogTitle>
              <DialogDescription className="mt-1">
                Esta ação irá excluir permanentemente o projeto e todos os dados relacionados.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Project Info */}
          <div className="space-y-3">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-lg">{project.title}</h4>
                <Badge variant="outline">
                  {project.status || 'Não definido'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Criado em {project.created_at ? format(new Date(project.created_at), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{project.type || 'Tipo não definido'}</span>
                </div>
              </div>
              
              {project.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
            
            {/* Project Statistics */}
            {loadingStats ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-3">
                <Separator />
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="flex items-center justify-center mb-1">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-blue-600">{projectStats.inspections}</div>
                    <div className="text-xs text-muted-foreground">Inspeções</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{projectStats.deliveredInspections}</div>
                    <div className="text-xs text-muted-foreground">Entregues</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{projectStats.editedInspections}</div>
                    <div className="text-xs text-muted-foreground">Editadas</div>
                  </div>
                  <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-amber-600">{projectStats.pendingInspections}</div>
                    <div className="text-xs text-muted-foreground">Pendentes</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Este projeto e todas as {projectStats.inspections} inspeções relacionadas serão excluídos permanentemente. Esta ação não pode ser desfeita.
            </AlertDescription>
          </Alert>
        </div>
        
        <DialogFooter>
          <div className="flex justify-end gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Excluindo...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Excluir Projeto
                </div>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}