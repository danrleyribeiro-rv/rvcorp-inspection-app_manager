// src/app/(dashboard)/inspections/create/page.js
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator"; // Not used, can be removed
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
import { CalendarIcon, Loader2, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { codeService } from "@/services/code-service";
import InspectionAddressForm from "../components/InspectionAddressForm";

export default function CreateInspectionPage() {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null); // For display of shared template info
  const [bulkMode, setBulkMode] = useState(false);
  // Initialize bulkInspections items with all potential individual fields
  const [bulkInspections, setBulkInspections] = useState([
    { title: "", area: "", template_id: null, inspector_id: null }
  ]);
  const [sharedData, setSharedData] = useState({
    project_id: "",
    template_id: null,
    inspector_id: null,
    scheduled_date: null,
    address: {
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: ""
    },
    observation: "",
    area: "", // Used if !bulkMode or (bulkMode && sameArea)
    sameArea: false,
    sameTemplate: false,
    sameInspector: false
  });
  
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.uid) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const projectsQuery = query(
        collection(db, 'projects'),
        where('manager_id', '==', user.uid),
        where('deleted_at', '==', null)
      );
      const projectsSnapshot = await getDocs(projectsQuery);
      const projectsData = projectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const templatesQuery = query(
        collection(db, 'templates'),
        where('deleted_at', '==', null)
      );
      const templatesSnapshot = await getDocs(templatesQuery);
      const templatesData = templatesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const inspectorsQuery = query(
        collection(db, 'inspectors'),
        where('deleted_at', '==', null)
      );
      const inspectorsSnapshot = await getDocs(inspectorsQuery);
      const inspectorsData = inspectorsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setProjects(projectsData);
      setTemplates(templatesData);
      setInspectors(inspectorsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const addBulkInspection = () => {
    // Add new inspection with all potential individual fields
    setBulkInspections([...bulkInspections, { title: "", area: "", template_id: null, inspector_id: null }]);
  };

  const removeBulkInspection = (index) => {
    setBulkInspections(bulkInspections.filter((_, i) => i !== index));
  };

  const updateBulkInspection = (index, field, value) => {
    const updated = [...bulkInspections];
    updated[index][field] = value;
    setBulkInspections(updated);
  };

  const handleTemplateChange = async (templateId) => {
    setSharedData(prev => ({ ...prev, template_id: templateId }));
    
    if (templateId) {
      try {
        const template = templates.find(t => t.id === templateId);
        setSelectedTemplate(template);
      } catch (error) {
        console.error("Error fetching template:", error);
        setSelectedTemplate(null);
      }
    } else {
      setSelectedTemplate(null);
    }
  };

  const convertTemplateToTopics = async (templateId) => {
    if (!templateId) return [];
    
    const template = templates.find(t => t.id === templateId);
    if (!template?.topics) return [];
    
    return template.topics.map(topic => ({
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!sharedData.project_id) {
        throw new Error("Projeto é obrigatório.");
      }

      const formattedAddress = sharedData.address.street ? 
        `${sharedData.address.street}${sharedData.address.number ? `, ${sharedData.address.number}` : ''}${sharedData.address.complement ? ` - ${sharedData.address.complement}` : ''}${sharedData.address.neighborhood ? `, ${sharedData.address.neighborhood}` : ''}${sharedData.address.city ? `, ${sharedData.address.city}` : ''}${sharedData.address.state ? ` - ${sharedData.address.state}` : ''}` : 
        null;

      if (bulkMode) {
        const validInspections = bulkInspections.filter(i => i.title?.trim());
        if (validInspections.length === 0) {
          throw new Error("Adicione pelo menos uma inspeção com título.");
        }

        for (const inspection of validInspections) {
          const currentTemplateId = sharedData.sameTemplate ? sharedData.template_id : inspection.template_id;
          const currentInspectorId = sharedData.sameInspector ? sharedData.inspector_id : inspection.inspector_id;
          const currentArea = sharedData.sameArea ? sharedData.area : (inspection.area || "");
          
          let topics = [];
          if (currentTemplateId) {
            topics = await convertTemplateToTopics(currentTemplateId);
          }

          const inspectionData = {
            title: inspection.title,
            observation: sharedData.observation || null,
            project_id: sharedData.project_id,
            template_id: currentTemplateId,
            inspector_id: currentInspectorId,
            status: "pending",
            scheduled_date: sharedData.scheduled_date ? new Date(sharedData.scheduled_date) : null,
            address: sharedData.address,
            address_string: formattedAddress,
            is_templated: !!currentTemplateId,
            area: currentArea,
            topics: topics
          };
          await codeService.createInspectionWithCode(inspectionData);
        }

        toast({
          title: "Inspeções criadas com sucesso",
          description: `${validInspections.length} inspeções foram criadas.`
        });
      } else {
        // Single inspection creation
        const singleInspectionItem = bulkInspections[0];
        if (!singleInspectionItem.title?.trim()) {
          throw new Error("Título da inspeção é obrigatório.");
        }

        let topics = [];
        if (sharedData.template_id) {
          topics = await convertTemplateToTopics(sharedData.template_id);
        }

        const inspectionData = {
          title: singleInspectionItem.title, // Title from the first item
          observation: sharedData.observation || null,
          project_id: sharedData.project_id,
          template_id: sharedData.template_id || null, // From sharedData
          inspector_id: sharedData.inspector_id || null, // From sharedData
          status: "pending",
          scheduled_date: sharedData.scheduled_date ? new Date(sharedData.scheduled_date) : null,
          address: sharedData.address,
          address_string: formattedAddress,
          is_templated: !!sharedData.template_id,
          area: sharedData.area || "", // From sharedData
          topics: topics
        };

        const result = await codeService.createInspectionWithCode(inspectionData);
        
        toast({
          title: "Inspeção criada com sucesso",
          description: `Código gerado: ${result.code}`
        });
      }

      router.push("/inspections");
    } catch (error) {
      console.error("Error creating inspection(s):", error);
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
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b shadow-sm">
        {/* Header */}
        <div className="container mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-xl font-bold">
                {bulkMode ? "Criar Inspeções em Lote" : "Nova Inspeção"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {bulkMode ? "Crie múltiplas inspeções de uma vez" : "Criar uma nova inspeção"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="bulk-mode"
                checked={bulkMode}
                onCheckedChange={setBulkMode}
              />
              <Label htmlFor="bulk-mode">Criação em Lote</Label>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Shared Configuration */}
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Configurações Gerais</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="project">Projeto <span className="text-red-500">*</span></Label>
                <Select
                  value={sharedData.project_id}
                  onValueChange={(value) => setSharedData(prev => ({ ...prev, project_id: value }))}
                  required
                >
                  <SelectTrigger id="project">
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

              <div>
                <Label htmlFor="scheduled_date">Data Agendada</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${
                        !sharedData.scheduled_date && "text-muted-foreground"
                      }`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {sharedData.scheduled_date ? (
                        format(new Date(sharedData.scheduled_date), "PPP", { locale: ptBR })
                      ) : (
                        <span>Selecione uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={sharedData.scheduled_date ? new Date(sharedData.scheduled_date) : undefined}
                      onSelect={(date) =>
                        setSharedData(prev => ({ ...prev, scheduled_date: date ? date.toISOString() : null }))
                      }
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <Label htmlFor="observation">Observações Gerais</Label>
              <Textarea
                id="observation"
                value={sharedData.observation}
                onChange={e => setSharedData(prev => ({ ...prev, observation: e.target.value }))}
                placeholder="Observações que se aplicam a todas as inspeções"
              />
            </div>

            {bulkMode && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="same-area"
                    checked={sharedData.sameArea}
                    onCheckedChange={(checked) => setSharedData(prev => ({ ...prev, sameArea: checked }))}
                  />
                  <Label htmlFor="same-area">Mesma metragem</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="same-template"
                    checked={sharedData.sameTemplate}
                    onCheckedChange={(checked) => setSharedData(prev => ({ ...prev, sameTemplate: checked }))}
                  />
                  <Label htmlFor="same-template">Mesmo template</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="same-inspector"
                    checked={sharedData.sameInspector}
                    onCheckedChange={(checked) => setSharedData(prev => ({ ...prev, sameInspector: checked }))}
                  />
                  <Label htmlFor="same-inspector">Mesmo vistoriador</Label>
                </div>
              </div>
            )}
            
            {/* Shared inputs for Area, Template, Inspector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Shared Area Input */}
              {(!bulkMode || (bulkMode && sharedData.sameArea)) && (
                <div>
                  <Label htmlFor="shared-area">Metragem (m²)</Label>
                  <Input
                      id="shared-area"
                      type="number"
                      value={sharedData.area}
                      onChange={e => setSharedData(prev => ({ ...prev, area: e.target.value }))}
                      placeholder="Ex: 120"
                  />
                </div>
              )}

              {/* Shared Template Select */}
              {(!bulkMode || (bulkMode && sharedData.sameTemplate)) && (
                <div>
                  <Label htmlFor="shared-template">Template</Label>
                  <Select
                    value={sharedData.template_id || "none"}
                    onValueChange={(value) => handleTemplateChange(value === "none" ? null : value)}
                  >
                    <SelectTrigger id="shared-template">
                        <SelectValue placeholder="Selecione um template" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                            {template.title}
                        </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Shared Inspector Select */}
              {(!bulkMode || (bulkMode && sharedData.sameInspector)) && (
                <div>
                  <Label htmlFor="shared-inspector">Vistoriador</Label>
                  <Select
                    value={sharedData.inspector_id || "none"}
                    onValueChange={(value) => setSharedData(prev => ({ ...prev, inspector_id: value === "none" ? null : value }))}
                  >
                    <SelectTrigger id="shared-inspector">
                        <SelectValue placeholder="Selecione um vistoriador" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {inspectors.map((inspector) => (
                        <SelectItem key={inspector.id} value={inspector.id}>
                            {`${inspector.name} ${inspector.last_name || ''}`.trim()}
                        </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Display selected shared template info */}
            {selectedTemplate && (!bulkMode || sharedData.sameTemplate) && (
              <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-blue-900">Template Selecionado</h4>
                  {selectedTemplate.cod && (
                    <span className="text-xs font-mono bg-blue-100 px-2 py-1 rounded">
                      {selectedTemplate.cod}
                    </span>
                  )}
                </div>
                {selectedTemplate.description && (
                  <p className="text-sm text-blue-700 mb-2">{selectedTemplate.description}</p>
                )}
                <div className="text-xs text-blue-600">
                  <span className="font-medium">Tópicos:</span> {selectedTemplate.topics?.length || 0} | 
                  <span className="font-medium ml-2">Itens:</span> {
                    selectedTemplate.topics?.reduce((total, topic) => 
                      total + (topic.items?.length || 0), 0
                    ) || 0
                  }
                </div>
              </div>
            )}
          </div>

          {/* Address Section */}
          <div className="bg-card border rounded-lg p-6">
            <InspectionAddressForm 
              address={sharedData.address} 
              onAddressChange={(address) => setSharedData(prev => ({ ...prev, address }))} 
            />
          </div>

          {/* Inspections List */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {bulkMode ? `Inspeções (${bulkInspections.length})` : "Detalhes da Inspeção"}
              </h2>
              {bulkMode && (
                <Button type="button" onClick={addBulkInspection} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Inspeção
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {bulkInspections.map((inspection, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex flex-col space-y-4 md:flex-row md:items-end md:gap-4 md:space-y-0">
                    <div className="flex-1">
                      <Label htmlFor={`title-${index}`}>
                        Título da Inspeção {bulkMode ? `#${index + 1}` : ''}
                        <span className="text-red-500"> *</span>
                      </Label>
                      <Input
                        id={`title-${index}`}
                        value={inspection.title}
                        onChange={e => updateBulkInspection(index, 'title', e.target.value)}
                        placeholder="Ex: Inspeção Apartamento 101"
                        required
                        className="mt-1"
                      />
                    </div>
                    
                    {/* Individual Area Input */}
                    {bulkMode && !sharedData.sameArea && (
                      <div className="md:w-40">
                        <Label htmlFor={`area-${index}`}>Metragem (m²)</Label>
                        <Input
                          id={`area-${index}`}
                          type="number"
                          value={inspection.area || ''}
                          onChange={e => updateBulkInspection(index, 'area', e.target.value)}
                          placeholder="120"
                          className="mt-1"
                        />
                      </div>
                    )}

                    {/* Individual Template Select */}
                    {bulkMode && !sharedData.sameTemplate && (
                       <div className="md:w-48">
                        <Label htmlFor={`template-${index}`}>Template</Label>
                        <Select
                          value={inspection.template_id || "none"}
                          onValueChange={(value) => updateBulkInspection(index, 'template_id', value === "none" ? null : value)}
                        >
                          <SelectTrigger id={`template-${index}`} className="mt-1">
                            <SelectValue placeholder="Template" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {templates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Individual Inspector Select */}
                    {bulkMode && !sharedData.sameInspector && (
                      <div className="md:w-48">
                        <Label htmlFor={`inspector-${index}`}>Vistoriador</Label>
                        <Select
                          value={inspection.inspector_id || "none"}
                          onValueChange={(value) => updateBulkInspection(index, 'inspector_id', value === "none" ? null : value)}
                        >
                          <SelectTrigger id={`inspector-${index}`} className="mt-1">
                            <SelectValue placeholder="Vistoriador" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {inspectors.map((inspector) => (
                              <SelectItem key={inspector.id} value={inspector.id}>
                                {`${inspector.name} ${inspector.last_name || ''}`.trim()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {bulkMode && bulkInspections.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon" // Changed to icon for compactness
                        onClick={() => removeBulkInspection(index)}
                        className="self-end md:mt-0" // Ensure button aligns with label height or input bottom
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "Criando..." : bulkMode ? "Criar Inspeções" : "Criar Inspeção"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}