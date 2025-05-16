// src/app/(dashboard)/templates/components/DeleteTemplateDialog.js
"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2 } from "lucide-react";

export default function DeleteTemplateDialog({ template, open, onClose, onDelete }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setLoading(true);
    try {
      // Exclusão real do documento no Firestore
      const templateRef = doc(db, 'templates', template.id);
      await deleteDoc(templateRef);

      toast({
        title: "Template excluído com sucesso",
      });
      if (typeof onDelete === 'function') {
        onDelete();
      }
      onClose();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Erro ao excluir template",
        description: error.message || "Falha ao excluir template.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!template) return null; // If no template is selected.

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex gap-x-2 items-center">
            <AlertTriangle className="text-destructive h-6 w-6" />
            Tem certeza?
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. Isso excluirá permanentemente o template "{template.title}".
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? "Excluindo..." : "Excluir Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}