// src/app/(dashboard)/projects/components/TransferProjectDialog.js
"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc, getDocs, collection } from "firebase/firestore";
import { db } from "@/lib/supabase";
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
import { toast } from "@/components/ui/use-toast";

export default function TransferProjectDialog({ project, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState([]);
  const [selectedManager, setSelectedManager] = useState("");

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      const managersSnap = await getDocs(collection(db, "managers"));
      setManagers(managersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (error) {
      console.error("Error fetching managers:", error);
    }
  };

  const handleTransfer = async () => {
    if (!selectedManager) return;

    setLoading(true);
    try {
      const selectedManagerData = managers.find(m => m.id === selectedManager);
      
      await updateDoc(doc(db, "projects", project.id), {
        managerId: selectedManager,
        managerName: `${selectedManagerData.name} ${selectedManagerData.surname}`,
        transferredAt: new Date().toISOString()
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
        description: "Erro ao transferir projeto",
        variant: "destructive"
      });
    }
    setLoading(false);
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
                  {`${manager.name} ${manager.surname}`}
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