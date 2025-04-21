// components/projects/components/DeleteProjectDialog.js
"use client"

import { useState } from "react"
import { db } from "@/lib/firebase"
import { doc, updateDoc, serverTimestamp } from "firebase/firestore"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { AlertTriangle } from "lucide-react"

export default function DeleteProjectDialog({ project, open, onClose, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <DialogTitle>Excluir Projeto</DialogTitle>
          </div>
          <DialogDescription>
            Tem certeza que deseja excluir o projeto "{project.title}"? Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <div className="flex justify-end gap-2 w-full">
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
            >
              {isLoading ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}