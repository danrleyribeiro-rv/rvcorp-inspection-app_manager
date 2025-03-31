// app/(dashboard)/inspections/components/DeleteInspectionDialog.js
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
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

export default function DeleteInspectionDialog({ inspection, open, onClose, onDelete }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setLoading(true);
    try {
      // Soft delete by setting deleted_at
      const { error } = await supabase
        .from('inspections')
        .update({ deleted_at: new Date() })
        .eq('id', inspection.id);

      if (error) throw error;

      toast({
        title: "Inspeção excluída com sucesso",
      });
      onDelete(); // Refresh inspection list
      onClose();
    } catch (error) {
      console.error("Error deleting inspection:", error);
      toast({
        title: "Erro ao excluir inspeção",
        description: error.message || "Falha ao excluir inspeção.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!inspection) return null; // If no inspection is selected.

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex gap-x-2 items-center">
            <AlertTriangle className="text-destructive h-6 w-6" />
            Tem certeza?
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. Isso excluirá permanentemente a inspeção "{inspection.title}".
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? "Excluindo..." : "Excluir Inspeção"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}