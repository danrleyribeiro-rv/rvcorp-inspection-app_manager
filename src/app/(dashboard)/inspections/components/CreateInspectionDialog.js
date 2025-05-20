// app/(dashboard)/inspections/components/CreateInspectionDialog.js
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
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
import { CalendarIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import InspectionAddressForm from "./InspectionAddressForm";
import { Switch } from "@/components/ui/switch";

export default function CreateInspectionDialog({ open, onClose, onSuccess, managerId }) {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    observation: "",
    project_id: "",
    template_id: null,
    inspector_id: null,
    status: "pending",
    scheduled_date: null,
    is_templated: false,
    address: {
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: ""
    }
  });
  const { toast } = useToast();

  useEffect(() => {
    if (managerId) {
      fetchData();
    }
  }, [managerId]);

  const fetchData = async () => {
    try {
      // Fetch projects managed by this manager
      const projectsQuery = query(
        collection(db, 'projects'),
        where('manager_id', '==', managerId),
        where('deleted_at', '==', null)
      );
      
      const projectsSnapshot = await getDocs(projectsQuery);
      
      const projectsData = projectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch templates
      const templatesQuery = query(
        collection(db, 'templates'),
        where('deleted_at', '==', null)
      );
      
      const templatesSnapshot = await getDocs(templatesQuery);
      
      const templatesData = templatesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch inspectors
      const inspectorsQuery = query(
        collection(db, 'inspectors'),
        where('deleted_at', '==', null)
      );
      
      const inspectorsSnapshot = await getDocs(inspectorsQuery);
      
      const inspectorsData = inspectorsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

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

  const handleAddressChange = (newAddress) => {
    setFormData(prev => ({
      ...prev,
      address: newAddress
    }));
  };

  // Function to convert template structure to inspection topics
  const convertTemplateToTopics = async (templateId) => {
    if (!templateId) return [];
    
    try {
      const templateRef = doc(db, 'templates', templateId);
      const templateDoc = await getDoc(templateRef);
      
      if (!templateDoc.exists()) return [];
      
      const templateData = templateDoc.data();
      
      if (!templateData.topics) return [];
      
      // Convert template structure to inspection structure
      return templateData.topics.map(topic => ({
        name: topic.name,
        description: topic.description || null,
        observation: null,
        items: (topic.items || []).map(item => ({
          name: item.name,
          description: item.description || null,
          observation: null,
          details: (item.details || []).map(detail => ({
            name: detail.name,
            type: detail.type,
            required: detail.required || false,
            options: detail.options || [],
            value: null,
            observation: null,
            is_damaged: false,
            media: [],
            non_conformities: []
          }))
        }))
      }));
    } catch (error) {
      console.error("Error converting template:", error);
      return [];
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!managerId) {
      toast({
        title: "Erro interno",
        description: "ID do gestor não encontrado. Recarregue a página.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      if (!formData.project_id || !formData.title) {
        throw new Error("Título da Inspeção e Projeto são obrigatórios.");
      }

      // Format address string
      const formattedAddress = formData.address.street ? 
        `${formData.address.street}${formData.address.number ? `, ${formData.address.number}` : ''}${formData.address.complement ? ` - ${formData.address.complement}` : ''}${formData.address.neighborhood ? `, ${formData.address.neighborhood}` : ''}${formData.address.city ? `, ${formData.address.city}` : ''}${formData.address.state ? ` - ${formData.address.state}` : ''}` : 
        null;

      // Convert template to topics if template is selected
      let topics = [];
      if (formData.template_id && formData.is_templated) {
        topics = await convertTemplateToTopics(formData.template_id);
      }

      // Prepare data for Firebase with new nested structure
      const inspectionData = {
        title: formData.title,
        observation: formData.observation || null,
        project_id: formData.project_id,
        template_id: formData.template_id || null,
        inspector_id: formData.inspector_id || null,
        status: formData.status,
        scheduled_date: formData.scheduled_date ? new Date(formData.scheduled_date) : null,
        address: formData.address,
        address_string: formattedAddress,
        is_templated: formData.is_templated,
        topics: topics, // Include the nested topics structure
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        deleted_at: null
      };

      // Add inspection to Firestore
      const docRef = await addDoc(collection(db, 'inspections'), inspectionData);
      
      toast({
        title: "Inspeção criada com sucesso"
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating inspection:", error);
      toast({
        title: "Erro ao criar inspeção",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Nova Inspeção</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título da Inspeção <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Inspeção Apartamento 101"
                required
              />
            </div>

            {/* Observation */}
            <div className="space-y-2">
              <Label htmlFor="observation">Observações</Label>
              <Textarea
                id="observation"
                value={formData.observation}
                onChange={e => setFormData({ ...formData, observation: e.target.value })}
                placeholder="Observações adicionais sobre a inspeção"
              />
            </div>

            {/* Project Selection */}
            <div className="space-y-2">
              <Label htmlFor="project">Projeto <span className="text-red-500">*</span></Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                required
              >
                <SelectTrigger id="project">
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.length === 0 && <SelectItem value="loading" disabled>Carregando...</SelectItem>}
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
              <Label htmlFor="template">Template (opcional)</Label>
              <Select
                value={formData.template_id || "none"}
                onValueChange={(value) => {
                  const templateId = value === "none" ? null : value;
                  setFormData({ 
                    ...formData, 
                    template_id: templateId,
                    is_templated: templateId !== null
                  });
                }}
              >
                <SelectTrigger id="template">
                  <SelectValue placeholder="Nenhum template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum template</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template Application Toggle */}
            {formData.template_id && (
              <div className="flex items-center justify-between">
                <Label htmlFor="is_templated">Aplicar estrutura do template</Label>
                <Switch
                  id="is_templated"
                  checked={formData.is_templated}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_templated: checked })}
                />
              </div>
            )}

            {/* Inspector Selection */}
            <div className="space-y-2">
              <Label htmlFor="inspector">Vistoriador (opcional)</Label>
              <Select
                value={formData.inspector_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, inspector_id: value === "none" ? null : value })}
              >
                <SelectTrigger id="inspector">
                  <SelectValue placeholder="Nenhum vistoriador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum vistoriador</SelectItem>
                  {inspectors.map((inspector) => (
                    <SelectItem key={inspector.id} value={inspector.id}>
                      {`${inspector.name} ${inspector.last_name || ''}`.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
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
                      format(new Date(formData.scheduled_date), "PPP", { locale: ptBR })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.scheduled_date ? new Date(formData.scheduled_date) : undefined}
                    onSelect={(date) =>
                      setFormData({ ...formData, scheduled_date: date ? date.toISOString() : null })
                    }
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Address Section */}
          <InspectionAddressForm 
            address={formData.address} 
            onAddressChange={handleAddressChange} 
          />

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "Criando..." : "Criar Inspeção"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}