// app/(dashboard)/inspections/components/CreateInspectionDialog.js
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";

export default function CreateInspectionDialog({ open, onClose, onSuccess, managerId }) {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    observation: "",
    project_id: "",
    template_id: null,  // Initialize to null
    inspector_id: null, // Initialize to null
    status: "pending",
    scheduled_date: null
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch projects managed by this manager
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, title')
        .eq('manager_id', managerId)
        .is('deleted_at', null);

      if (projectsError) throw projectsError;

      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('templates')
        .select('id, title')
        .is('deleted_at', null);

      if (templatesError) throw templatesError;

      // Fetch inspectors
      const { data: inspectorsData, error: inspectorsError } = await supabase
        .from('inspectors')
        .select('id, name, last_name')
        .is('deleted_at', null);

      if (inspectorsError) throw inspectorsError;

      setProjects(projectsData || []);
      setTemplates(templatesData || []);
      setInspectors(inspectorsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Basic validation
      if (!formData.project_id || !formData.title) {
        throw new Error("Preencha os campos obrigatórios");
      }

      // Create inspection
      const { data, error } = await supabase
        .from('inspections')
        .insert({
          title: formData.title,
          observation: formData.observation,
          project_id: formData.project_id,
          template_id: formData.template_id, // No need for || null
          inspector_id: formData.inspector_id, // No need for || null
          status: formData.status,
          scheduled_date: formData.scheduled_date,
          created_at: new Date()
        })
        .select();

      if (error) throw error;

      toast({
        title: "Inspeção criada com sucesso"
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating inspection:", error);
      toast({
        title: "Erro ao criar inspeção",
        description: error.message,
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
          <DialogTitle>Nova Inspeção</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-2">
            <Label>Título da Inspeção</Label>
            <Input
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Inspeção Apartamento 101"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.observation}
              onChange={e => setFormData({ ...formData, observation: e.target.value })}
              placeholder="Observações adicionais sobre a inspeção"
            />
          </div>

          {/* Project Selection */}
          <div className="space-y-2">
            <Label>Projeto</Label>
            <Select
              value={formData.project_id}
              onValueChange={(value) => setFormData({ ...formData, project_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um projeto" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Template (opcional)</Label>
            <Select
                value={formData.template_id}
                onValueChange={(value) => setFormData({ ...formData, template_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Nenhum template</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Inspector Selection */}
          <div className="space-y-2">
            <Label>Vistoriador (opcional)</Label>
            <Select
                value={formData.inspector_id}
                onValueChange={(value) => setFormData({ ...formData, inspector_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um vistoriador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Nenhum vistoriador</SelectItem>
                {inspectors.map((inspector) => (
                  <SelectItem key={inspector.id} value={inspector.id}>
                    {`${inspector.name} ${inspector.last_name || ''}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
                <SelectItem value="canceled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Scheduled Date */}
          <div className="space-y-2">
            <Label>Data Agendada (opcional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${
                    !formData.scheduled_date && "text-muted-foreground"
                  }`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.scheduled_date ? (
                    format(formData.scheduled_date, "PPP", { locale: ptBR })
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.scheduled_date}
                  onSelect={(date) =>
                    setFormData({ ...formData, scheduled_date: date })
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
              {loading ? "Criando..." : "Criar Inspeção"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}