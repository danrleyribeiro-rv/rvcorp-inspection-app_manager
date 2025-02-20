// src/app/(dashboard)/inspections/components/CreateInspectionDialog.js
"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, getDocs } from "firebase/firestore";
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
import { toast } from "@/hooks/use-toast";

export default function CreateInspectionDialog({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [formData, setFormData] = useState({
    projectId: "",
    templateId: "",
    inspectorId: "",
    scheduledDate: null,
    status: "pending",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [projectsSnap, templatesSnap, inspectorsSnap] = await Promise.all([
      getDocs(collection(db, "projects")),
      getDocs(collection(db, "templates")),
      getDocs(collection(db, "inspectors"))
    ]);

    setProjects(projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setTemplates(templatesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setInspectors(inspectorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedProject = projects.find(p => p.id === formData.projectId);
      const selectedTemplate = templates.find(t => t.id === formData.templateId);
      const selectedInspector = inspectors.find(i => i.id === formData.inspectorId);

      await addDoc(collection(db, "inspections"), {
        ...formData,
        projectName: selectedProject?.title || "",
        templateName: selectedTemplate?.title || "",
        inspectorName: selectedInspector ? 
          `${selectedInspector.name} ${selectedInspector.surname}` : "",
        createdAt: new Date().toISOString(),
        rooms: selectedTemplate?.rooms || [],
        mediaRequirements: selectedTemplate?.media_requirements || {},
      });

      toast({
        title: "Sucesso",
        description: "Inspeção criada com sucesso"
      });
      onClose();
    } catch (error) {
      console.error("Error creating inspection:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar inspeção",
        variant: "destructive"
      });
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Inspeção</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Selection */}
          <div className="space-y-2">
            <Label>Projeto</Label>
            <Select
              value={formData.projectId}
              onValueChange={(value) => setFormData({ ...formData, projectId: value })}
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
            <Label>Template</Label>
            <Select
              value={formData.templateId}
              onValueChange={(value) => setFormData({ ...formData, templateId: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
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

          {/* Scheduled Date */}
          <div className="space-y-2">
            <Label>Data Agendada</Label>
            <Calendar
              mode="single"
              selected={formData.scheduledDate}
              onSelect={(date) => setFormData({ ...formData, scheduledDate: date })}
              className="rounded-md border"
              required
            />
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
