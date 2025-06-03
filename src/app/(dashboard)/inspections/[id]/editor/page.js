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
import { addWatermarkToImage } from "@/utils/ImageWatermark";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  ChevronRight
} from "lucide-react";
import DetailEditor from "@/components/inspection/DetailEditor";
import MediaMoveDialog from "@/components/inspection/MediaMoveDialog";

export default function InspectionEditorPage({ params }) {
  const inspectionId = use(params).id;
  const [inspection, setInspection] = useState(null);
  const [originalInspection, setOriginalInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const [activeItemIndex, setActiveItemIndex] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [selectedMediaContext, setSelectedMediaContext] = useState(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [confirmExitDialog, setConfirmExitDialog] = useState(false);
  const mediaRef = useRef(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (inspection && originalInspection) {
      const current = JSON.stringify(inspection);
      const original = JSON.stringify(originalInspection);
      setHasUnsavedChanges(current !== original);
    }
  }, [inspection, originalInspection]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
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
      setOriginalInspection(structuredClone(formattedData));
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
      
      let fileToUpload = file;
      let url;
      
      if (mediaType === 'image') {
        const fileURL = URL.createObjectURL(file);
        const watermarkedImageURL = await addWatermarkToImage(fileURL, inspectionId);
        const response = await fetch(watermarkedImageURL);
        fileToUpload = await response.blob();
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
  };

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
    
    if (activeTopicIndex >= prev.topics.length - 1) {
      setActiveTopicIndex(Math.max(0, prev.topics.length - 2));
    }
    setActiveItemIndex(null);
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
    
    if (activeItemIndex === itemIndex) {
      setActiveItemIndex(null);
    } else if (activeItemIndex > itemIndex) {
      setActiveItemIndex(activeItemIndex - 1);
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

  const handleMoveMediaDrop = (item, destination) => {
    const { media, topicIndex: srcTopicIndex, itemIndex: srcItemIndex, 
            detailIndex: srcDetailIndex, mediaIndex: srcMediaIndex, 
            isNC: srcIsNC, ncIndex: srcNcIndex } = item;
            
    const { topicIndex: destTopicIndex, itemIndex: destItemIndex, 
            detailIndex: destDetailIndex, ncIndex: destNcIndex } = destination;
    
    const updatedInspection = structuredClone(inspection);
    
    let mediaToMove;
    if (srcIsNC) {
      mediaToMove = updatedInspection.topics[srcTopicIndex].items[srcItemIndex].details[srcDetailIndex].non_conformities[srcNcIndex].media[srcMediaIndex];
      updatedInspection.topics[srcTopicIndex].items[srcItemIndex].details[srcDetailIndex].non_conformities[srcNcIndex].media.splice(srcMediaIndex, 1);
    } else {
      mediaToMove = updatedInspection.topics[srcTopicIndex].items[srcItemIndex].details[srcDetailIndex].media[srcMediaIndex];
      updatedInspection.topics[srcTopicIndex].items[srcItemIndex].details[srcDetailIndex].media.splice(srcMediaIndex, 1);
    }
    
    if (destNcIndex !== undefined && destNcIndex !== null) {
      if (!updatedInspection.topics[destTopicIndex].items[destItemIndex].details[destDetailIndex].non_conformities[destNcIndex].media) {
        updatedInspection.topics[destTopicIndex].items[destItemIndex].details[destDetailIndex].non_conformities[destNcIndex].media = [];
      }
      
      updatedInspection.topics[destTopicIndex].items[destItemIndex].details[destDetailIndex].non_conformities[destNcIndex].media.push(mediaToMove);
    } else {
      if (!updatedInspection.topics[destTopicIndex].items[destItemIndex].details[destDetailIndex].media) {
        updatedInspection.topics[destTopicIndex].items[destItemIndex].details[destDetailIndex].media = [];
      }
      
      updatedInspection.topics[destTopicIndex].items[destItemIndex].details[destDetailIndex].media.push(mediaToMove);
    }
    
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
    setShowMoveDialog(true);
  };

  const removeMedia = async (topicIndex, itemIndex, detailIndex, mediaIndex, isNC = false, ncIndex = null) => {
    try {
      if (isNC) {
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

  const currentTopic = inspection.topics[activeTopicIndex];
  const currentItem = activeItemIndex !== null ? currentTopic?.items?.[activeItemIndex] : null;

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
          <Tabs value="topics" className="space-y-4">

            <TabsContent value="topics" className="space-y-4">
              <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
                {/* Topics Column */}
                <div className="col-span-3 border rounded-lg">
                  <div className="p-3 border-b flex justify-between items-center">
                    <h3 className="font-medium">Tópicos ({inspection.topics?.length || 0})</h3>
                    <Button size="sm" onClick={addTopic}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    <div className="p-2 space-y-1">
                      {inspection.topics?.map((topic, topicIndex) => (
                        <div
                          key={topicIndex}
                          className={`p-2 rounded cursor-pointer border ${
                            activeTopicIndex === topicIndex 
                              ? 'bg-primary text-primary-foreground' 
                              : 'hover:bg-accent'
                          }`}
                          onClick={() => {
                            setActiveTopicIndex(topicIndex);
                            setActiveItemIndex(null);
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium truncate">
                              {topic.name || `Tópico ${topicIndex + 1}`}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeTopic(topicIndex);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          {topic.items?.length > 0 && (
                            <span className="text-xs opacity-70">
                              {topic.items.length} ite{topic.items.length !== 1 ? 'ns' : 'm'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Items Column */}
                <div className="col-span-3 border rounded-lg">
                  <div className="p-3 border-b flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Tópico {activeTopicIndex + 1}</span>
                      <ChevronRight className="h-3 w-3" />
                      <span className="font-medium">Itens ({currentTopic?.items?.length || 0})</span>
                    </div>
                    {currentTopic && (
                      <Button size="sm" onClick={() => addItem(activeTopicIndex)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    {currentTopic ? (
                      <div className="p-2 space-y-3">
                        {/* Topic fields */}
                        <div className="space-y-2 p-2 bg-accent/20 rounded">
                          <div>
                            <Label className="text-xs">Nome do Tópico</Label>
                            <Input
                              value={currentTopic.name}
                              onChange={e => updateTopicField(activeTopicIndex, 'name', e.target.value)}
                              className="h-7 text-sm mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Descrição</Label>
                            <Input
                              value={currentTopic.description || ''}
                              onChange={e => updateTopicField(activeTopicIndex, 'description', e.target.value)}
className="h-7 text-sm mt-1"
                           />
                         </div>
                         <div>
                           <Label className="text-xs">Observação do Tópico</Label>
                           <Textarea
                             value={currentTopic.observation || ''}
                             onChange={e => updateTopicField(activeTopicIndex, 'observation', e.target.value)}
                             rows={2}
                             className="text-sm mt-1"
                           />
                         </div>
                       </div>
                       
                       {/* Items list */}
                       <div className="space-y-1">
                         {currentTopic.items?.map((item, itemIndex) => (
                           <div
                             key={itemIndex}
                             className={`p-2 rounded cursor-pointer border ${
                               activeItemIndex === itemIndex 
                                 ? 'bg-primary text-primary-foreground' 
                                 : 'hover:bg-accent'
                             }`}
                             onClick={() => setActiveItemIndex(itemIndex)}
                           >
                             <div className="flex justify-between items-center">
                               <span className="text-sm font-medium truncate">
                                 {item.name || `Item ${itemIndex + 1}`}
                               </span>
                               <Button
                                 size="sm"
                                 variant="ghost"
                                 className="h-6 w-6 p-0"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   removeItem(activeTopicIndex, itemIndex);
                                 }}
                               >
                                 <Trash2 className="h-3 w-3" />
                               </Button>
                             </div>
                             {item.details?.length > 0 && (
                               <span className="text-xs opacity-70">
                                 {item.details.length} detalhe{item.details.length !== 1 ? 's' : ''}
                               </span>
                             )}
                           </div>
                         ))}
                       </div>
                     </div>
                   ) : (
                     <div className="p-4 text-center text-muted-foreground">
                       Selecione um tópico para ver os itens
                     </div>
                   )}
                 </ScrollArea>
               </div>

               {/* Details Column */}
               <div className="col-span-6 border rounded-lg">
                 <div className="p-3 border-b flex justify-between items-center">
                   <div className="flex items-center gap-2">
                     {currentItem && (
                       <>
                         <span className="text-sm text-muted-foreground">Tópico {activeTopicIndex + 1}</span>
                         <ChevronRight className="h-3 w-3" />
                         <span className="text-sm text-muted-foreground">Item {activeItemIndex + 1}</span>
                         <ChevronRight className="h-3 w-3" />
                       </>
                     )}
                     <span className="font-medium">Detalhes ({currentItem?.details?.length || 0})</span>
                   </div>
                   {currentItem && (
                     <Button size="sm" onClick={() => addDetail(activeTopicIndex, activeItemIndex)}>
                       <Plus className="h-3 w-3" />
                     </Button>
                   )}
                 </div>
                 <ScrollArea className="h-[calc(100vh-280px)]">
                   {currentItem ? (
                     <div className="p-4 space-y-4">
                       {/* Item fields */}
                       <div className="space-y-3 p-3 bg-accent/20 rounded">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           <div>
                             <Label className="text-xs">Nome do Item</Label>
                             <Input
                               value={currentItem.name}
                               onChange={e => updateItemField(activeTopicIndex, activeItemIndex, 'name', e.target.value)}
                               className="h-7 text-sm mt-1"
                             />
                           </div>
                           <div>
                             <Label className="text-xs">Descrição</Label>
                             <Input
                               value={currentItem.description || ''}
                               onChange={e => updateItemField(activeTopicIndex, activeItemIndex, 'description', e.target.value)}
                               className="h-7 text-sm mt-1"
                             />
                           </div>
                         </div>
                         <div>
                           <Label className="text-xs">Observação do Item</Label>
                           <Textarea
                             value={currentItem.observation || ''}
                             onChange={e => updateItemField(activeTopicIndex, activeItemIndex, 'observation', e.target.value)}
                             rows={2}
                             className="text-sm mt-1"
                           />
                         </div>
                       </div>

                       {/* Details */}
                       <div className="space-y-3">
                         {currentItem.details?.map((detail, detailIndex) => (
                           <DetailEditor
                             key={detailIndex}
                             detail={detail}
                             detailIndex={detailIndex}
                             topicIndex={activeTopicIndex}
                             itemIndex={activeItemIndex}
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
                     </div>
                   ) : (
                     <div className="p-4 text-center text-muted-foreground">
                       {currentTopic 
                         ? "Selecione um item para ver os detalhes" 
                         : "Selecione um tópico e um item para ver os detalhes"
                       }
                     </div>
                   )}
                 </ScrollArea>
               </div>
             </div>
           </TabsContent>
         </Tabs>
       </div>
       
       {/* Media Viewer Dialog*/}
       {viewerOpen && selectedMedia && (
         <Dialog open={viewerOpen} onOpenChange={() => setViewerOpen(false)} className="max-w-4xl">
           <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col">
             <DialogHeader className="p-3 border-b flex items-center justify-between">
               <DialogTitle className="text-sm font-medium">Visualizador de Mídia</DialogTitle>
               <div className="flex gap-1">
                 <Button variant="outline" size="sm" className="h-7" onClick={() => setShowMoveDialog(true)}>
                   <Plus className="mr-1 h-3 w-3" />
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