// src/app/(dashboard)/inspections/[id]/editor/page.js
"use client";

import { useState, useEffect, useRef } from "react";
import { use } from "react";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useImageRotation } from "@/hooks/use-image-rotation";
import { addWatermarkToImage } from "@/utils/ImageWatermark";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  RotateCw,
  RotateCcw,
  Move,
  X,
  ChevronRight,
  ChevronDown,
  Loader2,
  AlertTriangle
} from "lucide-react";
import DetailEditor from "@/components/inspection/DetailEditor";
import MediaMoveDialog from "@/components/inspection/MediaMoveDialog";

export default function InspectionEditorPage({ params }) {
  const inspectionId = use(params).id;
  const [inspection, setInspection] = useState(null);
  const [originalInspection, setOriginalInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("topics");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [expandedTopics, setExpandedTopics] = useState([]);
  const [expandedItems, setExpandedItems] = useState([]);
  const [selectedMediaContext, setSelectedMediaContext] = useState(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveTarget, setMoveTarget] = useState(null);
  const [moveDialogExpandedTopics, setMoveDialogExpandedTopics] = useState([]);
  const [moveDialogExpandedItems, setMoveDialogExpandedItems] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [confirmExitDialog, setConfirmExitDialog] = useState(false);
  const mediaRef = useRef(null);
  const { toast } = useToast();
  const router = useRouter();
  const { rotation, setRotation, rotateImage, saveRotatedImage, saving: savingRotation } = useImageRotation();

  // Verificar mudanças não salvas quando o usuário tenta sair
  useEffect(() => {
    if (inspection && originalInspection) {
      // Verificar se houve alguma alteração
      const current = JSON.stringify(inspection);
      const original = JSON.stringify(originalInspection);
      setHasUnsavedChanges(current !== original);
    }
  }, [inspection, originalInspection]);

  // Adicionar confirmação de saída quando há mudanças não salvas
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ""; // Mensagem padrão usada pelo navegador
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    fetchInspection();
  }, [inspectionId]);

  const fetchInspection = async () => {
    try {
      const inspectionRef = doc(db, 'inspections', inspectionId);
      const inspectionDoc = await getDoc(inspectionRef);

      if (!inspectionDoc.exists()) {
        toast({
          title: "Inspeção não encontrada",
          variant: "destructive"
        });
        router.back();
        return;
      }

      const data = inspectionDoc.data();
      const formattedData = {
        id: inspectionDoc.id,
        ...data,
        topics: data.topics || []
      };
      
      setInspection(formattedData);
      setOriginalInspection(structuredClone(formattedData)); // Para comparar mudanças não salvas
    } catch (error) {
      console.error("Error fetching inspection:", error);
      toast({
        title: "Erro ao carregar inspeção",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveInspection = async () => {
    setSaving(true);
    try {
      const inspectionRef = doc(db, 'inspections', inspectionId);
      await updateDoc(inspectionRef, {
        ...inspection,
        updated_at: serverTimestamp()
      });

      // Após salvar com sucesso, atualize o originalInspection para a versão atual
      setOriginalInspection(structuredClone(inspection));
      setHasUnsavedChanges(false);

      toast({
        title: "Inspeção salva com sucesso"
      });
    } catch (error) {
      console.error("Error saving inspection:", error);
      toast({
        title: "Erro ao salvar inspeção",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      setConfirmExitDialog(true);
    } else {
      router.back();
    }
  };

  // Função para upload de mídia com marca d'água
  const uploadMedia = async (topicIndex, itemIndex, detailIndex, file, isNC = false, ncIndex = null) => {
    try {
      const fileExtension = file.name.split('.').pop();
      const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
      const timestamp = Date.now();
      const fileName = `${mediaType}_${timestamp}.${fileExtension}`;
      
      let storagePath;
      if (isNC) {
        storagePath = `inspections/${inspectionId}/topic_${topicIndex}/item_${itemIndex}/detail_${detailIndex}/non_conformities/nc_${ncIndex}/${fileName}`;
      } else {
        storagePath = `inspections/${inspectionId}/topic_${topicIndex}/item_${itemIndex}/detail_${detailIndex}/media/${fileName}`;
      }
      
      // Se for uma imagem, adicionar marca d'água
      let fileToUpload = file;
      let url;
      
      if (mediaType === 'image') {
        // Criar uma URL para o arquivo
        const fileURL = URL.createObjectURL(file);
        
        // Adicionar marca d'água
        const watermarkedImageURL = await addWatermarkToImage(fileURL, inspectionId);
        
        // Converter a URL de dados para um blob
        const response = await fetch(watermarkedImageURL);
        fileToUpload = await response.blob();
        
        // Revoke URL to avoid memory leaks
        URL.revokeObjectURL(fileURL);
      }

      const storageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(storageRef, fileToUpload);
      url = await getDownloadURL(snapshot.ref);

      const mediaObject = {
        id: `${mediaType}_${timestamp}`,
        type: mediaType,
        url: url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Atualizar o state com a nova mídia
      setInspection(prev => {
        const updated = structuredClone(prev);
        
        if (isNC) {
          if (!updated.topics[topicIndex].items[itemIndex].details[detailIndex].non_conformities[ncIndex].media) {
            updated.topics[topicIndex].items[itemIndex].details[detailIndex].non_conformities[ncIndex].media = [];
          }
          updated.topics[topicIndex].items[itemIndex].details[detailIndex].non_conformities[ncIndex].media.push(mediaObject);
        } else {
          if (!updated.topics[topicIndex].items[itemIndex].details[detailIndex].media) {
            updated.topics[topicIndex].items[itemIndex].details[detailIndex].media = [];
          }
          updated.topics[topicIndex].items[itemIndex].details[detailIndex].media.push(mediaObject);
        }
        
        return updated;
      });

      toast({
        title: "Mídia enviada com sucesso"
      });
    } catch (error) {
      console.error("Error uploading media:", error);
      toast({
        title: "Erro ao enviar mídia",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Função para salvar uma imagem rotacionada
  const handleSaveRotatedImage = async () => {
    if (!selectedMedia || !selectedMediaContext) return;
    
    try {
      await saveRotatedImage(selectedMedia, inspectionId, selectedMediaContext, inspection, setInspection);
      
      toast({
        title: "Imagem rotacionada salva com sucesso",
      });
      
      // Fechar o visualizador após salvar
      setViewerOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar imagem rotacionada",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const openMediaViewer = (media, topicIndex, itemIndex, detailIndex, mediaIndex, isNC = false, ncIndex = null) => {
    setSelectedMedia(media);
    setSelectedMediaContext({
      topicIndex,
      itemIndex,
      detailIndex,
      mediaIndex,
      isNC,
      ncIndex
    });
    setViewerOpen(true);
    setRotation(0); // Reset rotation
  };


  //diálogo de confirmação de saída
  const ConfirmExitDialog = () => (
    <Dialog open={confirmExitDialog} onOpenChange={setConfirmExitDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterações não salvas</DialogTitle>
          <DialogDescription>
            Você tem alterações não salvas. Deseja sair sem salvar?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-end gap-2 mt-4">
          <Button 
            variant="outline" 
            onClick={() => setConfirmExitDialog(false)}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => router.back()}
          >
            Sair sem salvar
          </Button>
          <Button 
            onClick={async () => {
              await saveInspection();
              router.back();
            }}
          >
            Salvar e sair
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const updateInspectionField = (field, value) => {
    setInspection(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateTopicField = (topicIndex, field, value) => {
    setInspection(prev => ({
      ...prev,
      topics: prev.topics.map((topic, index) =>
        index === topicIndex ? { ...topic, [field]: value } : topic
      )
    }));
  };

  const updateItemField = (topicIndex, itemIndex, field, value) => {
    setInspection(prev => ({
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
    setInspection(prev => ({
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
    setInspection(prev => ({
      ...prev,
      topics: [
        ...prev.topics,
        {
          name: "Novo Tópico",
          description: "",
          observation: "",
          items: []
        }
      ]
    }));
  };

  const removeTopic = (topicIndex) => {
    setInspection(prev => ({
      ...prev,
      topics: prev.topics.filter((_, index) => index !== topicIndex)
    }));
  };

  const toggleTopic = (topicIndex) => {
    if (expandedTopics.includes(topicIndex)) {
      setExpandedTopics(expandedTopics.filter(i => i !== topicIndex));
    } else {
      setExpandedTopics([...expandedTopics, topicIndex]);
    }
  };

  const addItem = (topicIndex) => {
    setInspection(prev => ({
      ...prev,
      topics: prev.topics.map((topic, index) =>
        index === topicIndex
          ? {
              ...topic,
              items: [
                ...topic.items,
                {
                  name: "Novo Item",
                  description: "",
                  observation: "",
                  details: []
                }
              ]
            }
          : topic
      )
    }));
  };

  const removeItem = (topicIndex, itemIndex) => {
    setInspection(prev => ({
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
  };

  const toggleItem = (topicIndex, itemIndex) => {
    const key = `${topicIndex}-${itemIndex}`;
    if (expandedItems.includes(key)) {
      setExpandedItems(expandedItems.filter(i => i !== key));
    } else {
      setExpandedItems([...expandedItems, key]);
    }
  };

  const addDetail = (topicIndex, itemIndex) => {
    setInspection(prev => ({
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
                        ...item.details,
                        {
                          name: "Novo Detalhe",
                          type: "text",
                          required: false,
                          value: null,
                          observation: "",
                          is_damaged: false,
                          media: [],
                          non_conformities: []
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
    setInspection(prev => ({
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

  // Função para mover mídia via drag and drop
  const handleMoveMediaDrop = (item, destination) => {
    const { media, topicIndex: srcTopicIndex, itemIndex: srcItemIndex, 
            detailIndex: srcDetailIndex, mediaIndex: srcMediaIndex, 
            isNC: srcIsNC, ncIndex: srcNcIndex } = item;
            
    const { topicIndex: destTopicIndex, itemIndex: destItemIndex, 
            detailIndex: destDetailIndex, ncIndex: destNcIndex } = destination;
    
    // Criar cópia do estado atual e mover a mídia
    const updatedInspection = structuredClone(inspection);
    
    // Obter a mídia a ser movida
    let mediaToMove;
    // Remove da origem
    if (srcIsNC) {
      mediaToMove = updatedInspection.topics[srcTopicIndex].items[srcItemIndex].details[srcDetailIndex].non_conformities[srcNcIndex].media[srcMediaIndex];
      updatedInspection.topics[srcTopicIndex].items[srcItemIndex].details[srcDetailIndex].non_conformities[srcNcIndex].media.splice(srcMediaIndex, 1);
    } else {
      mediaToMove = updatedInspection.topics[srcTopicIndex].items[srcItemIndex].details[srcDetailIndex].media[srcMediaIndex];
      updatedInspection.topics[srcTopicIndex].items[srcItemIndex].details[srcDetailIndex].media.splice(srcMediaIndex, 1);
    }
    
    // Adiciona ao destino
    if (destNcIndex !== undefined && destNcIndex !== null) {
      // Garante que a array existe
      if (!updatedInspection.topics[destTopicIndex].items[destItemIndex].details[destDetailIndex].non_conformities[destNcIndex].media) {
        updatedInspection.topics[destTopicIndex].items[destItemIndex].details[destDetailIndex].non_conformities[destNcIndex].media = [];
      }
      
      updatedInspection.topics[destTopicIndex].items[destItemIndex].details[destDetailIndex].non_conformities[destNcIndex].media.push(mediaToMove);
    } else {
      // Garante que a array existe
      if (!updatedInspection.topics[destTopicIndex].items[destItemIndex].details[destDetailIndex].media) {
        updatedInspection.topics[destTopicIndex].items[destItemIndex].details[destDetailIndex].media = [];
      }
      
      updatedInspection.topics[destTopicIndex].items[destItemIndex].details[destDetailIndex].media.push(mediaToMove);
    }
    
    // Atualiza o estado
    setInspection(updatedInspection);
    
    toast({
      title: "Mídia movida com sucesso"
    });
  };

  const openMoveDialog = (media, topicIndex, itemIndex, detailIndex, mediaIndex, isNC = false, ncIndex = null) => {
    setSelectedMedia(media);
    setSelectedMediaContext({
      topicIndex,
      itemIndex,
      detailIndex,
      mediaIndex,
      isNC,
      ncIndex
    });
    setMoveTarget(null);
    setMoveDialogExpandedTopics([]);
    setMoveDialogExpandedItems([]);
    setShowMoveDialog(true);
  };

  const removeMedia = async (topicIndex, itemIndex, detailIndex, mediaIndex, isNC = false, ncIndex = null) => {
    try {
      if (isNC) {
        // Remove from non-conformity
        setInspection(prev => ({
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
                            dIndex === detailIndex
                              ? {
                                  ...detail,
                                  non_conformities: detail.non_conformities.map((nc, ncIdx) =>
                                    ncIdx === ncIndex
                                      ? { ...nc, media: nc.media.filter((_, mIndex) => mIndex !== mediaIndex) }
                                      : nc
                                  )
                                }
                              : detail
                          )
                        }
                      : item
                  )
                }
              : topic
          )
        }));
      } else {
        // Remove from detail
        setInspection(prev => ({
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
                            dIndex === detailIndex
                              ? { ...detail, media: detail.media.filter((_, mIndex) => mIndex !== mediaIndex) }
                              : detail
                          )
                        }
                      : item
                  )
                }
              : topic
          )
        }));
      }

      toast({
        title: "Mídia removida com sucesso"
      });
    } catch (error) {
      console.error("Error removing media:", error);
      toast({
        title: "Erro ao remover mídia",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const addNonConformity = (topicIndex, itemIndex, detailIndex) => {
    const newNC = {
      id: `nc_${Date.now()}`,
      description: "",
      severity: "Baixa",
      status: "pendente",
      corrective_action: "",
      deadline: null,
      media: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setInspection(prev => ({
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
                        dIndex === detailIndex
                          ? { ...detail, non_conformities: [...(detail.non_conformities || []), newNC] }
                          : detail
                      )
                    }
                  : item
              )
            }
          : topic
      )
    }));
  };

  const removeNonConformity = (topicIndex, itemIndex, detailIndex, ncIndex) => {
    setInspection(prev => ({
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
                        dIndex === detailIndex
                          ? {
                              ...detail,
                              non_conformities: detail.non_conformities.filter((_, index) => index !== ncIndex)
                            }
                          : detail
                      )
                    }
                  : item
              )
            }
          : topic
      )
    }));
  };

  const updateNonConformity = (topicIndex, itemIndex, detailIndex, ncIndex, field, value) => {
    setInspection(prev => ({
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
                        dIndex === detailIndex
                          ? {
                              ...detail,
                              non_conformities: detail.non_conformities.map((nc, index) =>
                                index === ncIndex
                                  ? { ...nc, [field]: value, updated_at: new Date().toISOString() }
                                  : nc
                              )
                            }
                          : detail
                      )
                    }
                  : item
              )
            }
          : topic
      )
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Inspeção não encontrada</h2>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b shadow-sm">
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <div>
                <h1 className="text-xl font-bold">{inspection?.title}</h1>
                <p className="text-xs text-muted-foreground">ID: {inspection?.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <span className="text-sm text-amber-500 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Alterações não salvas
                </span>
              )}
              <Select value={inspection?.status} onValueChange={(value) => setInspection(prev => ({...prev, status: value}))}>
                <SelectTrigger className="w-36 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                  <SelectItem value="canceled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={saveInspection} disabled={saving || !hasUnsavedChanges}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="topics">Tópicos ({inspection.topics?.length || 0})</TabsTrigger>
              <TabsTrigger value="general">Informações Gerais</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Informações Gerais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div>
                    <Label htmlFor="title" className="text-sm">Título</Label>
                    <Input
                      id="title"
                      value={inspection.title}
                      onChange={e => updateInspectionField('title', e.target.value)}
                      className="h-8 mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="observation" className="text-sm">Observação Geral</Label>
                    <Textarea
                      id="observation"
                      value={inspection.observation || ''}
                      onChange={e => updateInspectionField('observation', e.target.value)}
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="topics" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-base font-semibold">Tópicos da Inspeção</h2>
                <Button size="sm" onClick={addTopic}>
                  <Plus className="mr-2 h-3 w-3" />
                  Adicionar Tópico
                </Button>
              </div>

              <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="space-y-3 pr-4">
                  {inspection.topics?.map((topic, topicIndex) => (
                    <Card key={topicIndex} className="overflow-hidden">
                      <div 
                        className={`flex items-center justify-between p-2 cursor-pointer border-b ${
                          expandedTopics.includes(topicIndex) ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => toggleTopic(topicIndex)}
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {expandedTopics.includes(topicIndex) ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />}
                          Tópico {topicIndex + 1}: {topic.name}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTopic(topicIndex);
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                          <Button 
                            onClick={(e) => {
                              e.stopPropagation();
                              addItem(topicIndex);
                            }} 
                            size="sm"
                            variant="ghost"
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Item
                          </Button>
                        </div>
                      </div>
                      
                      {expandedTopics.includes(topicIndex) && (
                        <CardContent className="space-y-3 pt-3 pb-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Nome do Tópico</Label>
                              <Input
                                value={topic.name}
                                onChange={e => updateTopicField(topicIndex, 'name', e.target.value)}
                                className="h-7 text-sm mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Descrição</Label>
                              <Input
                                value={topic.description || ''}
                                onChange={e => updateTopicField(topicIndex, 'description', e.target.value)}
                                className="h-7 text-sm mt-1"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Observação do Tópico</Label>
                            <Textarea
                              value={topic.observation || ''}
                              onChange={e => updateTopicField(topicIndex, 'observation', e.target.value)}
                              rows={2}
                              className="text-sm mt-1"
                            />
                          </div>

                          {/* Items */}
                          <div className="space-y-3">
                            <h3 className="text-xs font-medium text-muted-foreground">Itens ({topic.items?.length || 0})</h3>
                            {topic.items?.map((item, itemIndex) => (
                              <Card key={itemIndex} className="border-l-4 border-l-blue-300">
                                <div 
                                  className={`flex items-center justify-between p-2 cursor-pointer border-b ${
                                    expandedItems.includes(`${topicIndex}-${itemIndex}`) ? 'bg-blue-50/50' : 'hover:bg-gray-50'
                                  }`}
                                  onClick={() => toggleItem(topicIndex, itemIndex)}
                                >
                                  <div className="flex items-center gap-2 text-sm">
                                    {expandedItems.includes(`${topicIndex}-${itemIndex}`) ? 
                                      <ChevronDown className="h-3 w-3" /> : 
                                      <ChevronRight className="h-3 w-3" />}
                                    Item {itemIndex + 1}: {item.name}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeItem(topicIndex, itemIndex);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                    <Button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addDetail(topicIndex, itemIndex);
                                      }} 
                                      size="sm"
                                      variant="ghost"
                                    >
                                      <Plus className="mr-1 h-3 w-3" />
                                      Detalhe
                                    </Button>
                                  </div>
                                </div>
                                
                                {expandedItems.includes(`${topicIndex}-${itemIndex}`) && (
                                  <CardContent className="space-y-3 py-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div>
                                        <Label className="text-xs">Nome do Item</Label>
                                        <Input
                                          value={item.name}
                                          onChange={e => updateItemField(topicIndex, itemIndex, 'name', e.target.value)}
                                          className="h-7 text-sm mt-1"
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs">Descrição</Label>
                                        <Input
                                          value={item.description || ''}
                                          onChange={e => updateItemField(topicIndex, itemIndex, 'description', e.target.value)}
                                          className="h-7 text-sm mt-1"
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-xs">Observação do Item</Label>
                                      <Textarea
                                        value={item.observation || ''}
                                        onChange={e => updateItemField(topicIndex, itemIndex, 'observation', e.target.value)}
                                        rows={2}
                                        className="text-sm mt-1"
                                      />
                                    </div>

                                    {/* Details */}
                                    <div className="space-y-3">
                                      <h4 className="text-xs font-medium text-muted-foreground">Detalhes ({item.details?.length || 0})</h4>
                                      {item.details?.map((detail, detailIndex) => (
                                        <DetailEditor
                                          key={detailIndex}
                                          detail={detail}
                                          detailIndex={detailIndex}
                                          topicIndex={topicIndex}
                                          itemIndex={itemIndex}
                                          onUpdateDetail={updateDetailField}
                                          onRemoveDetail={removeDetail}
                                          onAddNonConformity={addNonConformity}
                                          onRemoveNonConformity={removeNonConformity}
                                          onUpdateNonConformity={updateNonConformity}
                                          onUploadMedia={uploadMedia}
                                          onRemoveMedia={removeMedia}
                                          onMoveMedia={openMoveDialog}
                                          onViewMedia={openMediaViewer}
                                          onMoveMediaDrop={handleMoveMediaDrop}
                                        />
                                      ))}
                                    </div>
                                  </CardContent>
                                )}
                              </Card>
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Media Viewer Dialog com botão de salvar rotação */}
        {viewerOpen && selectedMedia && (
          <Dialog open={viewerOpen} onOpenChange={() => setViewerOpen(false)} className="max-w-4xl">
            <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col">
              <DialogHeader className="p-3 border-b flex items-center justify-between">
                <DialogTitle className="text-sm font-medium">Visualizador de Mídia</DialogTitle>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="h-7" onClick={() => rotateImage('left')}>
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-7" onClick={() => rotateImage('right')}>
                    <RotateCw className="h-3 w-3" />
                  </Button>
                  {rotation !== 0 && (
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="h-7" 
                      onClick={handleSaveRotatedImage}
                      disabled={savingRotation}
                    >
                      {savingRotation ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3 mr-1" />
                      )}
                      Salvar
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="h-7" onClick={() => setShowMoveDialog(true)}>
                    <Move className="mr-1 h-3 w-3" />
                    <span className="text-xs">Mover</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setViewerOpen(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </DialogHeader>
              
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-50">
                <div 
                  ref={mediaRef}
                  className="max-h-full"
                  style={{ transform: `rotate(${rotation}deg)`, transition: "transform 0.3s ease" }}
                >
                  {selectedMedia.type === "image" ? (
                    <img
                      src={selectedMedia.url}
                      alt="Media"
                      className="max-h-[70vh] object-contain"
                    />
                  ) : (
                    <video
                      src={selectedMedia.url}
                      controls
                      className="max-h-[70vh]"
                    />
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
        
        {/* Move Media Dialog */}
        {showMoveDialog && selectedMedia && (
          <MediaMoveDialog
            open={showMoveDialog}
            onClose={() => setShowMoveDialog(false)}
            inspection={inspection}
            selectedMediaContext={selectedMediaContext}
            onMove={handleMoveMediaDrop}
          />
        )}

        {/* Confirmation Dialog */}
        <ConfirmExitDialog />
      </div>
    </DndProvider>
  );
}