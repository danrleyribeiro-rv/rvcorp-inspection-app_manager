// app/(dashboard)/inspections/components/CreateInspectionDialog.js
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
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
    project_id: "", // Required
    template_id: null,  // Optional
    inspector_id: null, // Optional
    status: "pending",
    scheduled_date: null
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

  const createInspectionHierarchy = async (inspectionId, templateId) => {
    try {
      console.log(`Starting hierarchy creation for inspection ${inspectionId} using template ${templateId}`);
      
      // Get template data
      const templatesQuery = query(
        collection(db, 'templates'),
        where('__name__', '==', templateId)
      );
      
      const templateSnapshot = await getDocs(templatesQuery);
      
      if (templateSnapshot.empty) {
        throw new Error(`Template with ID ${templateId} not found.`);
      }
      
      const template = templateSnapshot.docs[0].data();
      
      if (!template.rooms || !Array.isArray(template.rooms)) {
        console.warn(`Template ${templateId} has no rooms array or it's not an array. Skipping hierarchy creation.`);
        return true;
      }
      
      if (template.rooms.length === 0) {
        console.log(`Template ${templateId} has 0 rooms. Skipping hierarchy creation.`);
        return true; 
      }

      console.log(`Template ${templateId} has ${template.rooms.length} rooms.`);

      for (let i = 0; i < template.rooms.length; i++) {
        const room = template.rooms[i];
        const roomPosition = i + 1; // Use 1-based index for room_id

        // 1. Create room
        console.log(`Attempting to create room ${roomPosition}: ${room.name}`);
        await addDoc(collection(db, 'rooms'), {
          inspection_id: inspectionId,
          room_id: roomPosition, // Logical ID based on position
          room_name: room.name || `Room ${roomPosition}`,
          position: roomPosition,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });

        console.log(`Successfully created room ${roomPosition}: ${room.name}`);

        // 2. Create items for this room
        if (room.items && Array.isArray(room.items) && room.items.length > 0) {
          console.log(`Room ${roomPosition} has ${room.items.length} items.`);
          for (let j = 0; j < room.items.length; j++) {
            const item = room.items[j];
            const itemPosition = j + 1; // Use 1-based index for item_id

            // 2a. Create room_item
            console.log(`Attempting to create item ${itemPosition}: ${item.name} in room ${roomPosition}`);
            
            await addDoc(collection(db, 'room_items'), {
              inspection_id: inspectionId,
              room_id: roomPosition, // Logical ID from parent room
              item_id: itemPosition, // Logical ID based on position
              item_name: item.name || `Item ${itemPosition}`,
              position: itemPosition,
              created_at: serverTimestamp(),
              updated_at: serverTimestamp()
            });

            console.log(`Successfully created item ${itemPosition}: ${item.name} in room ${roomPosition}`);

            // 3. Create details for this item
            if (item.details && Array.isArray(item.details) && item.details.length > 0) {
              console.log(`Item ${itemPosition} has ${item.details.length} details.`);
              for (let k = 0; k < item.details.length; k++) {
                const detail = item.details[k];
                const detailPosition = k + 1; // Use 1-based index for detail_id

                // 3a. Create item_detail
                console.log(`Attempting to create detail ${detailPosition}: ${detail.name} for item ${itemPosition}`);
                try {
                  await addDoc(collection(db, 'item_details'), {
                    inspection_id: inspectionId,
                    room_id: roomPosition,
                    room_item_id: itemPosition, 
                    detail_id: detailPosition,  
                    detail_name: detail.name || `Detail ${detailPosition}`,
                    position: detailPosition,
                    created_at: serverTimestamp(),
                    updated_at: serverTimestamp()
                  });
                  
                  console.log(`Successfully created detail ${detailPosition}: ${detail.name}`);
                } catch (detailError) {
                  // Log the specific error and continue
                  console.error(`Error creating detail ${detailPosition} (${detail.name}) for item ${itemPosition} in room ${roomPosition}:`, detailError);
                  continue;
                }
              }
            } else {
              console.log(`Item ${itemPosition} has no details.`);
            }
          }
        } else {
          console.log(`Room ${roomPosition} has no items.`);
        }
      }

      console.log(`Successfully created complete inspection hierarchy for inspection ${inspectionId}`);
      return true;

    } catch (error) {
      console.error("Error creating inspection structure:", error);
      throw error;
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

      // Prepare data for Firebase
      const inspectionData = {
        title: formData.title,
        observation: formData.observation || null,
        project_id: formData.project_id,
        template_id: formData.template_id || null,
        inspector_id: formData.inspector_id || null,
        status: formData.status,
        scheduled_date: formData.scheduled_date ? new Date(formData.scheduled_date) : null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        deleted_at: null
      };

      // Add inspection to Firestore
      const docRef = await addDoc(collection(db, 'inspections'), inspectionData);
      
      const newInspectionId = docRef.id;
      console.log(`Inspection ${newInspectionId} created successfully.`);

      if (formData.template_id) {
        console.log(`Template selected (${formData.template_id}). Creating hierarchy...`);
        await createInspectionHierarchy(newInspectionId, formData.template_id);
        console.log(`Hierarchy creation process finished for inspection ${newInspectionId}.`);
      } else {
        console.log(`No template selected for inspection ${newInspectionId}. Skipping hierarchy creation.`);
      }

      toast({
        title: "Inspeção criada com sucesso"
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error during inspection creation process:", error);
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Inspeção</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              value={formData.project_id} // Project ID is required, so binding to "" is fine initially
              onValueChange={(value) => setFormData({ ...formData, project_id: value })}
              required
            >
              <SelectTrigger id="project">
                {/* Placeholder shows when value is "" */}
                <SelectValue placeholder="Selecione um projeto" />
              </SelectTrigger>
              <SelectContent>
                {projects.length === 0 && <SelectItem value="loading" disabled>Carregando...</SelectItem>} {/* Optional: Loading state */}
                {projects.map((project) => (
                  // Ensure value is never "" here
                  <SelectItem key={project.id} value={project.id.toString()}>
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
              value={formData.template_id?.toString() ?? ""}
              onValueChange={(value) => setFormData({ ...formData, template_id: value ? value : null })}
            >
              <SelectTrigger id="template">
                <SelectValue placeholder="Nenhum template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    {template.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Inspector Selection */}
          <div className="space-y-2">
            <Label htmlFor="inspector">Vistoriador (opcional)</Label>
            <Select
              value={formData.inspector_id?.toString() ?? ""}
              onValueChange={(value) => setFormData({ ...formData, inspector_id: value ? value : null })}
            >
              <SelectTrigger id="inspector">
                <SelectValue placeholder="Nenhum vistoriador" />
              </SelectTrigger>
              <SelectContent>
                {inspectors.map((inspector) => (
                  <SelectItem key={inspector.id} value={inspector.id.toString()}>
                    {`${inspector.name} ${inspector.last_name || ''}'.trim()`}
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

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.project_id || !formData.title}>
              {loading ? "Criando..." : "Criar Inspeção"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}