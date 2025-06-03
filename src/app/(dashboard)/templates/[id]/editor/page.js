// src/app/(dashboard)/templates/[id]/editor/page.js
"use client";

import { useState, useEffect, use } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { TEMPLATE_ICONS, TEMPLATE_COLORS } from "@/lib/constants";
import { codeService } from "@/services/code-service";

import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  ChevronRight,
  Settings,
  ListChecks,
  PencilRuler, // Added specific icons
  Ruler,
  Wrench,
  Puzzle,
  Home,
  Building,
  Store,
} from "lucide-react";

const RESPONSE_TYPES = [
  { value: "text", label: "Texto" },
  { value: "select", label: "Seleção" },
  { value: "number", label: "Número" },
  { value: "boolean", label: "Sim/Não" },
  { value: "measure", label: "Medida" }
];

const NEW_TEMPLATE_ID = "new";

const defaultNewTemplate = {
  title: "",
  description: "",
  template_price: "0.00",
  icon: "",
  icon_color: "",
  topics: [],
  cod: null,
};

// Define iconComponents mapping here
const editorIconComponents = {
  'pencil-ruler': PencilRuler,
  'ruler': Ruler,
  'wrench': Wrench,
  'puzzle': Puzzle,
  'house': Home,
  'building': Building,
  'store': Store,
  // Add other icons from TEMPLATE_ICONS if needed
};


export default function TemplateEditorPage({ params: routeParams }) {
  const { id: initialTemplateId } = use(routeParams);
  const [templateId, setTemplateId] = useState(initialTemplateId);

  const [template, setTemplate] = useState(null);
  const [originalTemplate, setOriginalTemplate] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(initialTemplateId === NEW_TEMPLATE_ID);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const [activeItemIndex, setActiveItemIndex] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [confirmExitDialog, setConfirmExitDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const { toast } = useToast();
  const router = useRouter();

  // Helper function to get the icon component instance
  const getVisualIcon = (iconName) => {
    const IconComponent = editorIconComponents[iconName];
    return IconComponent ? <IconComponent className="h-4 w-4 mr-2 shrink-0" /> : null;
  };

  // Helper function to get the color data
  const getSelectedColorData = (colorValue) => {
    return TEMPLATE_COLORS.find(c => c.value === colorValue);
  };


  useEffect(() => {
    if (template && originalTemplate) {
      const current = JSON.stringify(template);
      const original = JSON.stringify(originalTemplate);
      setHasUnsavedChanges(current !== original);
    } else if (template && !originalTemplate && isCreatingNew) {
        const current = JSON.stringify(template);
        const initial = JSON.stringify(defaultNewTemplate);
        setHasUnsavedChanges(current !== initial);
    }
  }, [template, originalTemplate, isCreatingNew]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    initializePageData();
  }, [initialTemplateId]);

  const initializePageData = async () => {
    setLoading(true);
    if (initialTemplateId === NEW_TEMPLATE_ID) {
      setIsCreatingNew(true);
      const newTpl = structuredClone(defaultNewTemplate);
      setTemplate(newTpl);
      setOriginalTemplate(structuredClone(newTpl));
      setLoading(false);
      setActiveTab("general");
    } else {
      setIsCreatingNew(false);
      await fetchTemplateData(initialTemplateId);
    }
  };

  const fetchTemplateData = async (idToFetch) => {
    try {
      const templateRef = doc(db, 'templates', idToFetch);
      const templateDoc = await getDoc(templateRef);

      if (!templateDoc.exists()) {
        toast({ title: "Template não encontrado", variant: "destructive" });
        router.replace("/templates");
        return;
      }
      const data = templateDoc.data();
      const formattedData = {
        id: templateDoc.id,
        ...data,
        template_price: (data.template_price || 0).toFixed(2),
        topics: data.topics || []
      };
      setTemplate(formattedData);
      setOriginalTemplate(structuredClone(formattedData));
      setActiveTab("general");
    } catch (error) {
      console.error("Error fetching template:", error);
      toast({ title: "Erro ao carregar template", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!template.title?.trim()) {
        toast({ title: "Erro de Validação", description: "O título do template é obrigatório.", variant: "destructive"});
        setActiveTab("general");
        return;
    }
    setSaving(true);
    try {
      const dataToSave = {
        ...template,
        template_price: parseFloat(template.template_price) || 0,
        updated_at: serverTimestamp()
      };
      const { id, ...docData } = dataToSave;

      if (isCreatingNew) {
        const newCode = await codeService.generateUniqueCode('templates');
        docData.cod = newCode;
        docData.created_at = serverTimestamp();
        
        const newTemplateRef = await addDoc(collection(db, 'templates'), docData);
        const newId = newTemplateRef.id;

        toast({ title: "Template criado com sucesso!", description: `Código: ${newCode}` });
        
        const newlySavedTemplate = { ...docData, id: newId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; // Simulate Firestore timestamp behavior for immediate UI update
        setTemplate(newlySavedTemplate);
        setOriginalTemplate(structuredClone(newlySavedTemplate));
        setIsCreatingNew(false);
        setTemplateId(newId);
        router.replace(`/templates/${newId}/editor`, { scroll: false });
        setHasUnsavedChanges(false);

      } else {
        const templateRef = doc(db, 'templates', templateId);
        await updateDoc(templateRef, docData);
        toast({ title: "Template salvo com sucesso" });

        const updatedTemplateData = { ...docData, id: templateId, updated_at: new Date().toISOString() };
        if (template.created_at) updatedTemplateData.created_at = template.created_at;
        setTemplate(updatedTemplateData);
        setOriginalTemplate(structuredClone(updatedTemplateData));
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast({ title: "Erro ao salvar template", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      setConfirmExitDialog(true);
    } else {
      router.push("/templates");
    }
  };

  const handlePriceChange = (e) => {
    let value = e.target.value;
    value = value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    updateTemplateField('template_price', value);
  };
  
  const handlePriceBlur = (e) => {
    let value = parseFloat(e.target.value);
    if (isNaN(value) || value < 0) {
      value = 0;
    }
    updateTemplateField('template_price', value.toFixed(2));
  };

  const updateTemplateField = (field, value) => {
    setTemplate(prev => ({ ...prev, [field]: value }));
  };

  const updateTopicField = (topicIndex, field, value) => {
    setTemplate(prev => ({
      ...prev,
      topics: prev.topics.map((topic, index) =>
        index === topicIndex ? { ...topic, [field]: value } : topic
      )
    }));
  };

  const updateItemField = (topicIndex, itemIndex, field, value) => {
    setTemplate(prev => ({
      ...prev,
      topics: prev.topics.map((topic, tIndex) =>
        tIndex === topicIndex
          ? {
              ...topic,
              items: topic.items.map((item, iIndex) =>
                iIndex === itemIndex ? { ...item, [field]: value } : item
              )
            }
          : topic
      )
    }));
  };

  const updateDetailField = (topicIndex, itemIndex, detailIndex, field, value) => {
    setTemplate(prev => ({
      ...prev,
      topics: prev.topics.map((topic, tIndex) =>
        tIndex === topicIndex
          ? {
              ...topic,
              items: topic.items.map((item, iIndex) =>
                iIndex === itemIndex
                  ? {
                      ...item,
                      details: item.details.map((detail, dIndex) =>
                        dIndex === detailIndex ? { ...detail, [field]: value } : detail
                      )
                    }
                  : item
              )
            }
          : topic
      )
    }));
  };

  const addTopic = () => {
    setTemplate(prev => ({
      ...prev,
      topics: [
        ...(prev.topics || []),
        {
          name: `Novo Tópico ${ (prev.topics?.length || 0) + 1}`,
          description: "",
          items: []
        }
      ]
    }));
  };

  const removeTopic = (topicIndex) => {
    const newTopics = template.topics.filter((_, index) => index !== topicIndex);
    setTemplate(prev => ({
      ...prev,
      topics: newTopics
    }));
    
    if (activeTopicIndex >= newTopics.length && newTopics.length > 0) {
      setActiveTopicIndex(newTopics.length - 1);
    } else if (newTopics.length === 0) {
      setActiveTopicIndex(0);
    }
    setActiveItemIndex(null);
  };

  const addItem = (topicIndex) => {
    setTemplate(prev => ({
      ...prev,
      topics: prev.topics.map((topic, index) =>
        index === topicIndex
          ? {
              ...topic,
              items: [
                ...(topic.items || []),
                {
                  name: `Novo Item ${(topic.items?.length || 0) + 1}`,
                  description: "",
                  details: []
                }
              ]
            }
          : topic
      )
    }));
  };

  const removeItem = (topicIndex, itemIndex) => {
    setTemplate(prev => ({
      ...prev,
      topics: prev.topics.map((topic, tIndex) =>
        tIndex === topicIndex
          ? {
              ...topic,
              items: topic.items.filter((_, iIndex) => iIndex !== itemIndex)
            }
          : topic
      )
    }));
    
    if (activeItemIndex === itemIndex) {
      setActiveItemIndex(null);
    } else if (activeItemIndex > itemIndex) {
      setActiveItemIndex(activeItemIndex - 1);
    }
  };

  const addDetail = (topicIndex, itemIndex) => {
    setTemplate(prev => ({
      ...prev,
      topics: prev.topics.map((topic, tIndex) =>
        tIndex === topicIndex
          ? {
              ...topic,
              items: topic.items.map((item, iIndex) =>
                iIndex === itemIndex
                  ? {
                      ...item,
                      details: [
                        ...(item.details || []),
                        {
                          name: `Novo Detalhe ${(item.details?.length || 0) + 1}`,
                          type: "text",
                          options: [],
                          optionsText: ""
                        }
                      ]
                    }
                  : item
              )
            }
          : topic
      )
    }));
  };

  const removeDetail = (topicIndex, itemIndex, detailIndex) => {
    setTemplate(prev => ({
      ...prev,
      topics: prev.topics.map((topic, tIndex) =>
        tIndex === topicIndex
          ? {
              ...topic,
              items: topic.items.map((item, iIndex) =>
                iIndex === itemIndex
                  ? {
                      ...item,
                      details: item.details.filter((_, dIndex) => dIndex !== detailIndex)
                    }
                  : item
              )
            }
          : topic
      )
    }));
  };

  const updateOptions = (topicIndex, itemIndex, detailIndex, optionsString) => {
    const options = optionsString
      .split(",")
      .map(option => option.trim())
      .filter(Boolean);
    
    updateDetailField(topicIndex, itemIndex, detailIndex, 'options', options);
    updateDetailField(topicIndex, itemIndex, detailIndex, 'optionsText', optionsString);
  };

  const ConfirmExitDialogComponent = () => (
    <Dialog open={confirmExitDialog} onOpenChange={setConfirmExitDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterações não salvas</DialogTitle>
          <DialogDescription>
            Você tem alterações não salvas. Deseja sair sem salvar?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setConfirmExitDialog(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={() => router.push("/templates")}>Sair sem salvar</Button>
          <Button 
            onClick={async () => {
              await saveTemplate();
              if (!saving) {
                 router.push("/templates");
              }
            }}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar e sair"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Não foi possível carregar os dados do template.</h2>
          <Button onClick={() => router.push("/templates")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Templates
          </Button>
        </div>
      </div>
    );
  }

  const currentTopic = template.topics?.[activeTopicIndex];
  const currentItem = activeItemIndex !== null ? currentTopic?.items?.[activeItemIndex] : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-10 bg-background border-b shadow-sm">
        <div className="container mx-auto flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Voltar</span>
            </Button>
            <div>
              <h1 className="text-xl font-bold">
                {isCreatingNew ? "Criar Novo Template" : `Editar: ${template?.title || 'Template'}`}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isCreatingNew 
                  ? "Defina as configurações e a estrutura do novo template."
                  : (template?.cod ? `Código: ${template.cod} | ` : '') + `ID: ${templateId}`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-sm text-amber-500 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Não salvo
              </span>
            )}
            <Button 
              size="sm" 
              onClick={saveTemplate} 
              disabled={saving || (!hasUnsavedChanges && !isCreatingNew && templateId !== NEW_TEMPLATE_ID) }
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isCreatingNew ? "Criar e Salvar" : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden p-4">
        <TabsList className="mb-4 shrink-0">
          <TabsTrigger value="general" className="px-4 py-2 flex items-center gap-2">
            <Settings className="h-4 w-4" /> Configurações Gerais
          </TabsTrigger>
          <TabsTrigger value="structure" className="px-4 py-2 flex items-center gap-2">
            <ListChecks className="h-4 w-4" /> Estrutura do Template
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="flex-1 overflow-y-auto space-y-6 p-1">
            <ScrollArea className="h-full pr-2">
                <div className="space-y-6 py-4 px-4">
                    <div>
                        <Label htmlFor="templateTitle" className="font-medium">Título do Template <span className="text-red-500">*</span></Label>
                        <Input 
                            id="templateTitle" 
                            value={template.title} 
                            onChange={e => updateTemplateField('title', e.target.value)}
                            placeholder="Ex: Inspeção de Equipamento X"
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="templateDescription" className="font-medium">Descrição</Label>
                        <Textarea 
                            id="templateDescription" 
                            value={template.description} 
                            onChange={e => updateTemplateField('description', e.target.value)}
                            placeholder="Detalhes sobre este template..."
                            className="mt-1 min-h-[100px]"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="templatePrice" className="font-medium">Preço (R$)</Label>
                            <Input 
                                id="templatePrice" 
                                type="text" 
                                value={template.template_price} 
                                onChange={handlePriceChange}
                                onBlur={handlePriceBlur}
                                placeholder="0.00"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="templateIcon" className="font-medium">Ícone</Label>
                            <Select value={template.icon} onValueChange={val => updateTemplateField('icon', val)}>
                                <SelectTrigger id="templateIcon" className="mt-1">
                                    {/* Directly render custom content within SelectTrigger */}
                                    <div className="flex items-center w-full"> {/* w-full to take available space */}
                                        {template.icon ? (
                                            <>
                                                {getVisualIcon(template.icon)}
                                                <span>{TEMPLATE_ICONS.find(i => i.value === template.icon)?.label}</span>
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground">Selecione um ícone</span> // Placeholder text
                                        )}
                                    </div>
                                    {/* Radix SelectTrigger usually adds its own caret icon. We don't need to add one manually. */}
                                </SelectTrigger>
                                <SelectContent>
                                    {TEMPLATE_ICONS.map(iconOption => (
                                    <SelectItem key={iconOption.value} value={iconOption.value}>
                                        <div className="flex items-center">
                                            {getVisualIcon(iconOption.value)}
                                            {iconOption.label}
                                        </div>
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* For Cor do Ícone */}
                        <div>
                            <Label htmlFor="templateIconColor" className="font-medium">Cor do Ícone</Label>
                            <Select value={template.icon_color} onValueChange={val => updateTemplateField('icon_color', val)}>
                                <SelectTrigger id="templateIconColor" className="mt-1 w-full"> {/* Added w-full */}
                                    <div className="flex items-center flex-1"> {/* flex-1 */}
                                        {template.icon_color && getSelectedColorData(template.icon_color) ? (
                                            <>
                                                <div className={`w-3.5 h-3.5 rounded-full mr-2 shrink-0 ${getSelectedColorData(template.icon_color)?.class}`} />
                                                <span className="truncate"> {/* Added truncate */}
                                                    {getSelectedColorData(template.icon_color)?.label}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground">Selecione uma cor</span>
                                        )}
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {TEMPLATE_COLORS.map(colorOption => (
                                    <SelectItem key={colorOption.value} value={colorOption.value}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3.5 h-3.5 rounded-full ${colorOption.class}`} />
                                            {colorOption.label}
                                        </div>
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </TabsContent>

        <TabsContent value="structure" className="flex-1 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 h-full">
            <div className="col-span-12 md:col-span-3 border rounded-lg flex flex-col">
              <div className="p-3 border-b flex justify-between items-center shrink-0">
                <h3 className="font-medium">Tópicos ({template.topics?.length || 0})</h3>
                <Button size="sm" variant="outline" onClick={addTopic}><Plus className="h-3 w-3" /></Button>
              </div>
              <ScrollArea className="flex-1 p-2 space-y-1">
                {template.topics?.map((topic, topicIndex) => (
                  <div
                    key={`topic-${topicIndex}-${topic.name}`} 
                    className={`p-2 rounded cursor-pointer border ${
                      activeTopicIndex === topicIndex 
                        ? 'bg-primary text-primary-foreground shadow-md' 
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => { setActiveTopicIndex(topicIndex); setActiveItemIndex(null); }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium truncate pr-1">{topic.name || `Tópico ${topicIndex + 1}`}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={(e) => { e.stopPropagation(); removeTopic(topicIndex); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {topic.items?.length > 0 && <span className="text-xs opacity-70">{topic.items.length} ite{topic.items.length !== 1 ? 'ns' : 'm'}</span>}
                  </div>
                ))}
                {template.topics?.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">Nenhum tópico adicionado.</p>}
              </ScrollArea>
            </div>

            <div className="col-span-12 md:col-span-3 border rounded-lg flex flex-col">
              <div className="p-3 border-b flex justify-between items-center shrink-0">
                <div className="flex items-center gap-1 truncate">
                  {currentTopic && <><span className="text-xs text-muted-foreground hidden lg:inline">Tópico {activeTopicIndex + 1}</span><ChevronRight className="h-3 w-3 hidden lg:inline" /></>}
                  <span className="font-medium">Itens ({currentTopic?.items?.length || 0})</span>
                </div>
                {currentTopic && <Button size="sm" variant="outline" onClick={() => addItem(activeTopicIndex)}><Plus className="h-3 w-3" /></Button>}
              </div>
              <ScrollArea className="flex-1">
                {currentTopic ? (
                  <div className="p-2 space-y-3">
                    <div className="space-y-2 p-2 bg-muted/30 rounded border">
                      <div>
                        <Label className="text-xs">Nome do Tópico</Label>
                        <Input value={currentTopic.name} onChange={e => updateTopicField(activeTopicIndex, 'name', e.target.value)} className="h-8 text-sm mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Descrição do Tópico</Label>
                        <Input value={currentTopic.description || ''} onChange={e => updateTopicField(activeTopicIndex, 'description', e.target.value)} className="h-8 text-sm mt-1" />
                      </div>
                    </div>
                    <div className="space-y-1">
                        {currentTopic.items?.map((item, itemIndex) => (
                        <div
                            key={`item-${activeTopicIndex}-${itemIndex}-${item.name}`}
                            className={`p-2 rounded cursor-pointer border ${
                            activeItemIndex === itemIndex ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-accent'
                            }`}
                            onClick={() => setActiveItemIndex(itemIndex)}
                        >
                            <div className="flex justify-between items-center">
                            <span className="text-sm font-medium truncate pr-1">{item.name || `Item ${itemIndex + 1}`}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={(e) => { e.stopPropagation(); removeItem(activeTopicIndex, itemIndex);}}>
                                <Trash2 className="h-3 w-3" />
                            </Button>
                            </div>
                            {item.details?.length > 0 && <span className="text-xs opacity-70">{item.details.length} detalhe{item.details.length !== 1 ? 's' : ''}</span>}
                        </div>
                        ))}
                        {currentTopic.items?.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">Nenhum item neste tópico.</p>}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">Selecione um tópico para ver/adicionar itens.</div>
                )}
              </ScrollArea>
            </div>

            <div className="col-span-12 md:col-span-6 border rounded-lg flex flex-col">
              <div className="p-3 border-b flex justify-between items-center shrink-0">
                <div className="flex items-center gap-1 truncate">
                  {currentItem && (
                    <>
                      <span className="text-xs text-muted-foreground hidden lg:inline">Tópico {activeTopicIndex + 1}</span><ChevronRight className="h-3 w-3 hidden lg:inline" />
                      <span className="text-xs text-muted-foreground hidden lg:inline">Item {activeItemIndex + 1}</span><ChevronRight className="h-3 w-3 hidden lg:inline" />
                    </>
                  )}
                  <span className="font-medium">Detalhes ({currentItem?.details?.length || 0})</span>
                </div>
                {currentItem && <Button size="sm" variant="outline" onClick={() => addDetail(activeTopicIndex, activeItemIndex)}><Plus className="h-3 w-3" /></Button>}
              </div>
              <ScrollArea className="flex-1">
                {currentItem ? (
                  <div className="p-3 space-y-4">
                    <div className="space-y-3 p-3 bg-muted/30 rounded border">
                        <Label className="text-sm font-medium">Configurações do Item</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs">Nome do Item</Label>
                                <Input value={currentItem.name} onChange={e => updateItemField(activeTopicIndex, activeItemIndex, 'name', e.target.value)} className="h-8 text-sm mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs">Descrição do Item</Label>
                                <Input value={currentItem.description || ''} onChange={e => updateItemField(activeTopicIndex, activeItemIndex, 'description', e.target.value)} className="h-8 text-sm mt-1" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Campos de Detalhe</Label>
                      {currentItem.details?.map((detail, detailIndex) => (
                        <div key={`detail-${activeTopicIndex}-${activeItemIndex}-${detailIndex}-${detail.name}`} className="border rounded-md p-3 space-y-3 bg-card shadow-sm">
                          <div className="flex justify-between items-center">
                            <Label className="text-xs font-semibold">Detalhe {detailIndex + 1}</Label>
                            <Button size="icon" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive/80" onClick={() => removeDetail(activeTopicIndex, activeItemIndex, detailIndex)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Nome do Detalhe</Label>
                              <Input value={detail.name} onChange={e => updateDetailField(activeTopicIndex, activeItemIndex, detailIndex, 'name', e.target.value)} className="h-8 text-sm mt-1" />
                            </div>
                            <div>
                              <Label className="text-xs">Tipo de Resposta</Label>
                              <Select value={detail.type} onValueChange={value => updateDetailField(activeTopicIndex, activeItemIndex, detailIndex, 'type', value)}>
                                <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {RESPONSE_TYPES.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {detail.type === "select" && (
                            <div>
                              <Label className="text-xs">Opções (separadas por vírgula)</Label>
                              <Input value={detail.optionsText || detail.options?.join(", ") || ""} onChange={e => updateOptions(activeTopicIndex, activeItemIndex, detailIndex, e.target.value)} placeholder="Opção 1, Opção 2..." className="h-8 text-sm mt-1" />
                            </div>
                          )}
                        </div>
                      ))}
                       {currentItem.details?.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">Nenhum detalhe adicionado a este item.</p>}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {currentTopic ? "Selecione um item para ver/adicionar detalhes." : "Selecione um tópico e um item."}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </TabsContent>
      </Tabs>
       
      <ConfirmExitDialogComponent />
    </div>
  );
}