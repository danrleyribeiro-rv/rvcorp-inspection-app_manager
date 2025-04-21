// src/app/(dashboard)/projects/components/TransferProjectDialog.js
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function TransferProjectDialog({ project, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState([]);
  const [selectedManager, setSelectedManager] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      // Query active managers from Firestore
      const managersQuery = query(
        collection(db, 'managers'),
        where('deleted_at', '==', null)
      );
      
      const managersSnapshot = await getDocs(managersQuery);
      
      const managersList = managersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setManagers(managersList);
    } catch (error) {
      console.error("Error fetching managers:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar lista de gerentes",
        variant: "destructive"
      });
    }
  };

  const handleTransfer = async () => {
    if (!selectedManager) {
      toast({
        title: "Erro",
        description: "Selecione um gerente para transferir o projeto",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Get the selected manager's data for recording who the project was transferred to
      const selectedManagerData = managers.find(m => m.id === selectedManager);
      if (!selectedManagerData) {
        throw new Error("Dados do gerente não encontrados");
      }
      
      // Update the project with new manager
      const projectRef = doc(db, 'projects', project.id);
      
      await updateDoc(projectRef, {
        manager_id: selectedManager,
        managerName: `${selectedManagerData.name || ''} ${selectedManagerData.surname || ''}`.trim(),
        transferredAt: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      toast({
        title: "Sucesso",
        description: "Projeto transferido com sucesso"
      });
      
      onClose();
    } catch (error) {
      console.error("Error transferring project:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao transferir projeto",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir Projeto</DialogTitle>
          <DialogDescription>
            Selecione um gerente para transferir o projeto "{project.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Select
            value={selectedManager}
            onValueChange={setSelectedManager}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um gerente" />
            </SelectTrigger>
            <SelectContent>
              {managers.map((manager) => (
                <SelectItem key={manager.id} value={manager.id}>
                  {`${manager.name || ''} ${manager.surname || ''}`.trim()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleTransfer} 
            disabled={!selectedManager || loading}
          >
            {loading ? "Transferindo..." : "Transferir Projeto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}