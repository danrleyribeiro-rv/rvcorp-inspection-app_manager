// src/app/(dashboard)/projects/components/EditProjectDialog.js
"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc, getDocs, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function EditProjectDialog({ project, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [formData, setFormData] = useState({
    title: project.title,
    description: project.description,
    clientId: project.clientId,
    inspectorId: project.inspectorId,
    status: project.status,
    inspectionDate: project.inspectionDate ? new Date(project.inspectionDate) : null
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [clientsSnap, inspectorsSnap] = await Promise.all([
      getDocs(collection(db, "clients")),
      getDocs(collection(db, "inspectors"))
    ]);

    setClients(clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setInspectors(inspectorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedClient = clients.find(c => c.id === formData.clientId);
      const selectedInspector = inspectors.find(i => i.id === formData.inspectorId);

      await updateDoc(doc(db, "projects", project.id), {
        ...formData,
        clientName: selectedClient?.name || "",
        inspectorName: selectedInspector ? `${selectedInspector.name} ${selectedInspector.surname}` : "",
        updatedAt: new Date().toISOString()
      });

      toast({
        title: "Sucesso",
        description: "Projeto atualizado com sucesso"
      });
      onClose();
    } catch (error) {
      console.error("Error updating project:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar projeto",
        variant: "destructive"
      });
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Projeto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select
              value={formData.clientId}
              onValueChange={(value) => setFormData({ ...formData, clientId: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Vistoriador</Label>
            <Select
              value={formData.inspectorId}
              onValueChange={(value) => setFormData({ ...formData, inspectorId: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um vistoriador" />
              </SelectTrigger>
              <SelectContent>
                {inspectors.map((inspector) => (
                  <SelectItem key={inspector.id} value={inspector.id}>
                    {`${inspector.name} ${inspector.surname}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data da Vistoria</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${
                    !formData.inspectionDate && "text-muted-foreground"
                  }`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.inspectionDate ? (
                    format(formData.inspectionDate, "PPP", { locale: ptBR })
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.inspectionDate}
                  onSelect={(date) =>
                    setFormData({ ...formData, inspectionDate: date })
                  }
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}