// app/(dashboard)/inspections/[id]/editor/page.js
"use client";

import { use, useState, useEffect, useRef } from "react";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  Video,
  AlertTriangle,
  Move,
  Edit,
  CheckCircle,
  Clock,
  X,
  ChevronRight,
  ChevronDown
} from "lucide-react";

export default function InspectionEditorPage({ params }) {
  const inspectionId = use(params).id;
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("topics");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [expandedTopics, setExpandedTopics] = useState([]);
  const [expandedItems, setExpandedItems] = useState([]);
  const [selectedMediaContext, setSelectedMediaContext] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveTarget, setMoveTarget] = useState(null);
  const [moveDialogExpandedTopics, setMoveDialogExpandedTopics] = useState([]);
  const [moveDialogExpandedItems, setMoveDialogExpandedItems] = useState([]);
  const mediaRef = useRef(null);
  const { toast } = useToast();
  const router = useRouter();

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
      setInspection({
        id: inspectionDoc.id,
        ...data,
        topics: data.topics || []
      });
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

      const storageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);

      const mediaObject = {
        id: `${mediaType}_${timestamp}`,
        type: mediaType,
        url: url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (isNC) {
        // Add to non-conformity media
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
                                      ? { ...nc, media: [...(nc.media || []), mediaObject] }
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
        // Add to detail media
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
                              ? { ...detail, media: [...(detail.media || []), mediaObject] }
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

  // Funções para movimentação de mídia
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

  // Função para mover mídia
  const moveMedia = (sourceTopicIndex, sourceItemIndex, sourceDetailIndex, sourceMediaIndex, targetTopicIndex, targetItemIndex, targetDetailIndex, isNC = false, sourceNCIndex = null) => {
    // Cópia do estado atual
    const updatedInspection = { ...inspection };
    
    // Encontra a mídia de origem
    let mediaToMove;
    if (isNC) {
      mediaToMove = { ...updatedInspection.topics[sourceTopicIndex].items[sourceItemIndex].details[sourceDetailIndex].non_conformities[sourceNCIndex].media[sourceMediaIndex] };
      // Remove mídia da origem
      updatedInspection.topics[sourceTopicIndex].items[sourceItemIndex].details[sourceDetailIndex].non_conformities[sourceNCIndex].media.splice(sourceMediaIndex, 1);
    } else {
      mediaToMove = { ...updatedInspection.topics[sourceTopicIndex].items[sourceItemIndex].details[sourceDetailIndex].media[sourceMediaIndex] };
      // Remove mídia da origem
      updatedInspection.topics[sourceTopicIndex].items[sourceItemIndex].details[sourceDetailIndex].media.splice(sourceMediaIndex, 1);
    }
    
    // Adiciona mídia ao destino
    if (!updatedInspection.topics[targetTopicIndex].items[targetItemIndex].details[targetDetailIndex].media) {
      updatedInspection.topics[targetTopicIndex].items[targetItemIndex].details[targetDetailIndex].media = [];
    }
    updatedInspection.topics[targetTopicIndex].items[targetItemIndex].details[targetDetailIndex].media.push(mediaToMove);
    
    // Atualiza o estado
    setInspection(updatedInspection);
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

// Componente de mídia arrastável
const DraggableMedia = ({ media, topicIndex, itemIndex, detailIndex, mediaIndex, isNC = false, ncIndex = null, onView, onMove, onRemove }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'MEDIA_ITEM',
    item: { 
      media, 
      topicIndex, 
      itemIndex, 
      detailIndex, 
      mediaIndex,
      isNC,
      ncIndex
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });
  
  return (
    <div 
      ref={drag}
      className={`relative group ${isDragging ? 'opacity-50' : ''}`}
      onClick={() => onView(media, topicIndex, itemIndex, detailIndex, mediaIndex, isNC, ncIndex)}
      style={{ cursor: 'grab' }}
    >
      <div className="aspect-square border rounded-md overflow-hidden bg-gray-50">
        {media.type === 'image' ? (
          <img
            src={media.url}
            alt="Media"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="h-6 w-6 text-gray-400" />
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant="destructive"
        className="absolute top-0 right-0 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(topicIndex, itemIndex, detailIndex, mediaIndex, isNC, ncIndex);
        }}
      >
        <X className="h-2 w-2" />
      </Button>
      <Button
        size="sm"
        variant="secondary"
        className="absolute bottom-0 right-0 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onMove(media, topicIndex, itemIndex, detailIndex, mediaIndex, isNC, ncIndex);
        }}
      >
        <Move className="h-2 w-2" />
      </Button>
    </div>
  );
};

    // Componente de área que aceita drops
const MediaDropzone = ({ topicIndex, itemIndex, detailIndex }) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'MEDIA_ITEM',
    drop: (item) => {
      // Movendo a mídia quando soltada
      handleMoveMedia(
        item,
        { topicIndex, itemIndex, detailIndex }
      );
    },
    collect: (monitor) => ({
      isOver: !!monitor.isDragging(),
    }),
  });
  
  return (
    <div 
      ref={drop} 
      className={`border-2 border-dashed rounded-md p-1 min-h-[60px] ${
        isOver ? 'border-primary bg-primary/10' : 'border-gray-200'
      }`}
    >
      <p className="text-xs text-muted-foreground">Arraste uma mídia para cá</p>
    </div>
  );
};

const handleMoveMedia = (sourceItem, destination) => {
  const { topicIndex: srcTopicIndex, itemIndex: srcItemIndex, 
          detailIndex: srcDetailIndex, mediaIndex: srcMediaIndex, 
          isNC: srcIsNC, ncIndex: srcNcIndex } = sourceItem;
          
  const { topicIndex: destTopicIndex, itemIndex: destItemIndex, 
          detailIndex: destDetailIndex, ncIndex: destNcIndex } = destination;
  
  // Criar uma cópia do estado atual
  const updatedInspection = {...inspection};
  
  // Obter a mídia a ser movida
  let mediaToMove;
  if (srcIsNC) {
    mediaToMove = {...updatedInspection.topics[srcTopicIndex].items[srcItemIndex].details[srcDetailIndex].non_conformities[srcNcIndex].media[srcMediaIndex]};
    // Remove da origem
    updatedInspection.topics[srcTopicIndex].items[srcItemIndex].details[srcDetailIndex].non_conformities[srcNcIndex].media.splice(srcMediaIndex, 1);
  } else {
    mediaToMove = {...updatedInspection.topics[srcTopicIndex].items[srcItemIndex].details[srcDetailIndex].media[srcMediaIndex]};
    // Remove da origem
    updatedInspection.topics[srcTopicIndex].items[srcItemIndex].details[srcDetailIndex].media.splice(srcMediaIndex, 1);
  }
  
  // Adiciona ao destino
  if (destNcIndex !== undefined) {
    // Destino é uma NC
    if (!updatedInspection.topics[destTopicIndex].items[destItemIndex].details[destDetailIndex].non_conformities[destNcIndex].media) {
      updatedInspection.topics[destTopicIndex].items[destItemIndex].details[destDetailIndex].non_conformities[destNcIndex].media = [];
    }
    updatedInspection.topics[destTopicIndex].items[destItemIndex].details[destDetailIndex].non_conformities[destNcIndex].media.push(mediaToMove);
  } else {
    // Destino é um detalhe normal
    if (!updatedInspection.topics[destTopicIndex].items[destItemIndex].details[destDetailIndex].media) {
      updatedInspection.topics[destTopicIndex].items[destItemIndex].details[destDetailIndex].media = [];
    }
    updatedInspection.topics[destTopicIndex].items[destItemIndex].details[destDetailIndex].media.push(mediaToMove);
  }
  
  setInspection(updatedInspection);
  toast({ title: "Mídia movida com sucesso" });
};

// Funções para visualizador de mídia
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
  setRotation(0);
};

const rotateImage = (direction) => {
  const newRotation = direction === 'left' 
    ? (rotation - 90) % 360 
    : (rotation + 90) % 360;
  setRotation(newRotation);
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

  const getSeverityColor = (severity) => {
    const colors = {
      'Baixa': 'bg-green-100 text-green-800',
      'Média': 'bg-yellow-100 text-yellow-800',
      'Alta': 'bg-red-100 text-red-800',
      'Crítica': 'bg-red-600 text-white'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      'pendente': 'bg-yellow-100 text-yellow-800',
      'em_andamento': 'bg-blue-100 text-blue-800',
      'resolvida': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

 return (
  <DndProvider backend={HTML5Backend}>
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b shadow-sm">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-xl font-bold">{inspection.title}</h1>
              <p className="text-xs text-muted-foreground">ID: {inspection.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={inspection.status} onValueChange={(value) => updateInspectionField('status', value)}>
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
            <Button size="sm" onClick={saveInspection} disabled={saving}>
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
                                      <Card key={detailIndex} className="border-l-4 border-l-green-300">
                                        <CardHeader className="py-2 px-3">
                                          <div className="flex items-center justify-between">
                                            <div className="text-sm font-medium flex items-center gap-2">
                                              {detail.name}
                                              {detail.is_damaged && (
                                                <Badge variant="destructive" className="text-xs">Danificado</Badge>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={() => removeDetail(topicIndex, itemIndex, detailIndex)}
                                              >
                                                <Trash2 className="h-3 w-3 text-destructive" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2"
                                                onClick={() => addNonConformity(topicIndex, itemIndex, detailIndex)}
                                              >
                                                <AlertTriangle className="mr-1 h-3 w-3" />
                                                <span className="text-xs">NC</span>
                                              </Button>
                                            </div>
                                          </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3 py-2">
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div>
                                              <Label className="text-xs">Nome do Detalhe</Label>
                                              <Input
                                                value={detail.name}
                                                onChange={e => updateDetailField(topicIndex, itemIndex, detailIndex, 'name', e.target.value)}
                                                className="h-7 text-sm mt-1"
                                              />
                                            </div>
                                            <div>
                                              <Label className="text-xs">Tipo</Label>
                                              <Select
                                                value={detail.type}
                                                onValueChange={value => updateDetailField(topicIndex, itemIndex, detailIndex, 'type', value)}
                                              >
                                                <SelectTrigger className="h-7 text-sm mt-1">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="text">Texto</SelectItem>
                                                  <SelectItem value="number">Número</SelectItem>
                                                  <SelectItem value="select">Seleção</SelectItem>
                                                  <SelectItem value="boolean">Sim/Não</SelectItem>
                                                  <SelectItem value="image">Imagem</SelectItem>
                                                  <SelectItem value="video">Vídeo</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <div className="flex items-center gap-2 mt-5">
                                                <Switch
                                                  id={`required-${topicIndex}-${itemIndex}-${detailIndex}`}
                                                  checked={detail.required}
                                                  onCheckedChange={checked => updateDetailField(topicIndex, itemIndex, detailIndex, 'required', checked)}
                                                  className="scale-75"
                                                />
                                                <Label htmlFor={`required-${topicIndex}-${itemIndex}-${detailIndex}`} className="text-xs">Obrigatório</Label>
                                              </div>
                                              <div className="flex items-center gap-2 mt-5">
                                                <Switch
                                                  id={`damaged-${topicIndex}-${itemIndex}-${detailIndex}`}
                                                  checked={detail.is_damaged}
                                                  onCheckedChange={checked => updateDetailField(topicIndex, itemIndex, detailIndex, 'is_damaged', checked)}
                                                  className="scale-75"
                                                />
                                                <Label htmlFor={`damaged-${topicIndex}-${itemIndex}-${detailIndex}`} className="text-xs">Danificado</Label>
                                              </div>
                                            </div>
                                          </div>

                                          <div>
                                            <Label className="text-xs">Valor</Label>
                                            {detail.type === 'boolean' ? (
                                              <Select
                                                value={detail.value || ''}
                                                onValueChange={value => updateDetailField(topicIndex, itemIndex, detailIndex, 'value', value)}
                                              >
                                                <SelectTrigger className="h-7 text-sm mt-1">
                                                  <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="true">Sim</SelectItem>
                                                  <SelectItem value="false">Não</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            ) : detail.type === 'select' && detail.options ? (
                                              <Select
                                                value={detail.value || ''}
                                                onValueChange={value => updateDetailField(topicIndex, itemIndex, detailIndex, 'value', value)}
                                              >
                                                <SelectTrigger className="h-7 text-sm mt-1">
                                                  <SelectValue placeholder="Selecione uma opção" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {detail.options.map((option, optIndex) => (
                                                    <SelectItem key={optIndex} value={option}>
                                                      {option}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            ) : (
                                              <Input
                                                value={detail.value || ''}
                                                onChange={e => updateDetailField(topicIndex, itemIndex, detailIndex, 'value', e.target.value)}
                                                type={detail.type === 'number' ? 'number' : 'text'}
                                                className="h-7 text-sm mt-1"
                                              />
                                            )}
                                          </div>

                                          <div>
                                            <Label className="text-xs">Observação do Detalhe</Label>
                                            <Textarea
                                              value={detail.observation || ''}
                                              onChange={e => updateDetailField(topicIndex, itemIndex, detailIndex, 'observation', e.target.value)}
                                              rows={2}
                                              className="text-sm mt-1"
                                            />
                                          </div>

                                            {/* Media Section with Drag & Drop */}
                                            <div className="pt-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <Label className="text-xs">Mídia ({detail.media?.length || 0})</Label>
                                                <div>
                                                <input
                                                    type="file"
                                                    accept="image/*,video/*"
                                                    onChange={e => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        uploadMedia(topicIndex, itemIndex, detailIndex, file);
                                                    }
                                                    e.target.value = '';
                                                    }}
                                                    style={{ display: 'none' }}
                                                    id={`media-upload-${topicIndex}-${itemIndex}-${detailIndex}`}
                                                />
                                                <Button
                                                    size="sm"
                                                    className="h-6 text-xs"
                                                    onClick={() => document.getElementById(`media-upload-${topicIndex}-${itemIndex}-${detailIndex}`).click()}
                                                >
                                                    <Upload className="mr-1 h-3 w-3" />
                                                    Mídia
                                                </Button>
                                                </div>
                                            </div>
                                            
                                            {detail.media && detail.media.length > 0 ? (
                                                <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
                                                {detail.media.map((media, mediaIndex) => (
                                                    <div 
                                                    key={mediaIndex}
                                                    className="relative group cursor-grab"
                                                    onClick={() => openMediaViewer(media, topicIndex, itemIndex, detailIndex, mediaIndex)}
                                                    >
                                                    <div className="aspect-square border rounded-md overflow-hidden bg-gray-50">
                                                        {media.type === 'image' ? (
                                                        <img src={media.url} alt="Media" className="w-full h-full object-cover" />
                                                        ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Video className="h-6 w-6 text-gray-400" />
                                                        </div>
                                                        )}
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className="absolute top-0 right-0 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeMedia(topicIndex, itemIndex, detailIndex, mediaIndex);
                                                        }}
                                                    >
                                                        <X className="h-2 w-2" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        className="absolute bottom-0 right-0 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={(e) => {
                                                        e.stopPropagation();
                                                        openMoveDialog(media, topicIndex, itemIndex, detailIndex, mediaIndex);
                                                        }}
                                                    >
                                                        <Move className="h-2 w-2" />
                                                    </Button>
                                                    </div>
                                                ))}
                                                </div>
                                            ) : (
                                                <div className="border-2 border-dashed rounded-md p-1 min-h-[60px] flex items-center justify-center">
                                                <p className="text-xs text-muted-foreground">Clique no botão acima para adicionar mídia</p>
                                                </div>
                                            )}
                                            </div>
                                          {/* Non-Conformities */}
                                          {detail.non_conformities && detail.non_conformities.length > 0 && (
                                            <div className="pt-1">
                                              <Label className="text-xs font-medium">
                                                Não Conformidades ({detail.non_conformities.length})
                                              </Label>
                                              <div className="space-y-2 mt-1">
                                                {detail.non_conformities.map((nc, ncIndex) => (
                                                  <Card key={ncIndex} className="border-l-4 border-l-red-300">
                                                    <CardHeader className="py-2 px-3">
                                                      <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1 text-xs">
                                                          <Badge className={`text-xs py-0 px-1 ${getSeverityColor(nc.severity)}`}>
                                                            {nc.severity}
                                                          </Badge>
                                                          <Badge className={`text-xs py-0 px-1 ${getStatusColor(nc.status)}`}>
                                                            {nc.status === 'pendente' && 'Pendente'}
                                                            {nc.status === 'em_andamento' && 'Em Andamento'}
                                                            {nc.status === 'resolvida' && 'Resolvida'}
                                                          </Badge>
                                                        </div>
                                                        <Button
                                                          variant="ghost"
                                                          size="sm"
                                                          className="h-5 w-5 p-0"
                                                          onClick={() => removeNonConformity(topicIndex, itemIndex, detailIndex, ncIndex)}
                                                        >
                                                          <Trash2 className="h-3 w-3 text-destructive" />
                                                        </Button>
                                                      </div>
                                                    </CardHeader>
                                                    <CardContent className="space-y-2 py-2">
                                                      <div>
                                                        <Label className="text-xs">Descrição</Label>
                                                        <Textarea
                                                          value={nc.description}
                                                          onChange={e => updateNonConformity(topicIndex, itemIndex, detailIndex, ncIndex, 'description', e.target.value)}
                                                          rows={1}
                                                          className="text-sm mt-1"
                                                        />
                                                      </div>
                                                      <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                          <Label className="text-xs">Severidade</Label>
                                                          <Select
                                                            value={nc.severity}
                                                            onValueChange={value => updateNonConformity(topicIndex, itemIndex, detailIndex, ncIndex, 'severity', value)}
                                                          >
                                                            <SelectTrigger className="h-7 text-sm mt-1">
                                                              <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                              <SelectItem value="Baixa">Baixa</SelectItem>
                                                              <SelectItem value="Média">Média</SelectItem>
                                                              <SelectItem value="Alta">Alta</SelectItem>
                                                              <SelectItem value="Crítica">Crítica</SelectItem>
                                                            </SelectContent>
                                                          </Select>
                                                        </div>
                                                        <div>
                                                          <Label className="text-xs">Status</Label>
                                                          <Select
                                                            value={nc.status}
                                                            onValueChange={value => updateNonConformity(topicIndex, itemIndex, detailIndex, ncIndex, 'status', value)}
                                                          >
                                                            <SelectTrigger className="h-7 text-sm mt-1">
                                                              <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                              <SelectItem value="pendente">Pendente</SelectItem>
                                                              <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                                              <SelectItem value="resolvida">Resolvida</SelectItem>
                                                            </SelectContent>
                                                          </Select>
                                                        </div>
                                                      </div>
                                                      <div>
                                                        <Label className="text-xs">Ação Corretiva</Label>
                                                        <Textarea
                                                          value={nc.corrective_action || ''}
                                                          onChange={e => updateNonConformity(topicIndex, itemIndex, detailIndex, ncIndex, 'corrective_action', e.target.value)}
                                                          rows={1}
                                                          className="text-sm mt-1"
                                                        />
                                                      </div>
                                                      <div>
                                                        <Label className="text-xs">Prazo</Label>
                                                        <Input
                                                          type="date"
                                                          value={nc.deadline ? nc.deadline.split('T')[0] : ''}
                                                          onChange={e => updateNonConformity(topicIndex, itemIndex, detailIndex, ncIndex, 'deadline', e.target.value ? `${e.target.value}T00:00:00.000` : null)}
                                                          className="h-7 text-sm mt-1"
                                                        />
                                                      </div>

                                                      {/* NC Media */}
                                                      <div>
                                                        <div className="flex items-center justify-between">
                                                          <Label className="text-xs">Mídia da NC ({nc.media?.length || 0})</Label>
                                                          <div>
                                                            <input
                                                              type="file"
                                                              accept="image/*,video/*"
                                                              onChange={e => {
                                                                const file = e.target.files[0];
                                                                if (file) {
                                                                  uploadMedia(topicIndex, itemIndex, detailIndex, file, true, ncIndex);
                                                                }
                                                                e.target.value = '';
                                                              }}
                                                              style={{ display: 'none' }}
                                                              id={`nc-media-upload-${topicIndex}-${itemIndex}-${detailIndex}-${ncIndex}`}
                                                            />
                                                            <Button
                                                              size="sm"
                                                              className="h-6 text-xs"
                                                              onClick={() => document.getElementById(`nc-media-upload-${topicIndex}-${itemIndex}-${detailIndex}-${ncIndex}`).click()}
                                                            >
                                                              <Upload className="mr-1 h-3 w-3" />
                                                              Mídia
                                                            </Button>
                                                          </div>
                                                        </div>
                                                        {nc.media && nc.media.length > 0 ? (
                                                          <div className="grid grid-cols-3 md:grid-cols-6 gap-1 mt-1">
                                                            {nc.media.map((media, mediaIndex) => (
                                                              <div 
                                                                key={mediaIndex}
                                                                ref={drag => {
                                                                  // Configurando o draggable para cada mídia de NC
                                                                  const { drag: dragFn } = useDrag({
                                                                    type: 'MEDIA_ITEM',
                                                                    item: { 
                                                                      media, 
                                                                      topicIndex, 
                                                                      itemIndex, 
                                                                      detailIndex,
                                                                      mediaIndex,
                                                                     isNC: true,
                                                                     ncIndex
                                                                   },
                                                                 })();
                                                                 drag(dragFn);
                                                               }}
                                                               className="relative group"
                                                               onClick={() => openMediaViewer(media, topicIndex, itemIndex, detailIndex, mediaIndex, true, ncIndex)}
                                                               style={{ cursor: 'grab' }}
                                                             >
                                                               <div className="aspect-square border rounded-md overflow-hidden bg-gray-50">
                                                                 {media.type === 'image' ? (
                                                                   <img
                                                                     src={media.url}
                                                                     alt="NC Media"
                                                                     className="w-full h-full object-cover"
                                                                   />
                                                                 ) : (
                                                                   <div className="w-full h-full flex items-center justify-center">
                                                                     <Video className="h-6 w-6 text-gray-400" />
                                                                   </div>
                                                                 )}
                                                               </div>
                                                               <Button
                                                                 size="sm"
                                                                 variant="destructive"
                                                                 className="absolute top-0 right-0 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                 onClick={(e) => {
                                                                   e.stopPropagation();
                                                                   removeMedia(topicIndex, itemIndex, detailIndex, mediaIndex, true, ncIndex);
                                                                 }}
                                                               >
                                                                 <X className="h-2 w-2" />
                                                               </Button>
                                                               <Button
                                                                 size="sm"
                                                                 variant="secondary"
                                                                 className="absolute bottom-0 right-0 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                 onClick={(e) => {
                                                                   e.stopPropagation();
                                                                   openMoveDialog(media, topicIndex, itemIndex, detailIndex, mediaIndex, true, ncIndex);
                                                                 }}
                                                               >
                                                                 <Move className="h-2 w-2" />
                                                               </Button>
                                                             </div>
                                                           ))}
                                                         </div>
                                                       ) : (
                                                         <div 
                                                           ref={drop => {
                                                             // Configurando o droppable para NC
                                                             const { drop: dropFn } = useDrop({
                                                               accept: 'MEDIA_ITEM',
                                                               drop: (item) => {
                                                                 // Movendo a mídia quando soltada para NC
                                                                 const targetMedia = item.isNC ? 
                                                                   inspection.topics[item.topicIndex].items[item.itemIndex].details[item.detailIndex].non_conformities[item.ncIndex].media[item.mediaIndex] :
                                                                   inspection.topics[item.topicIndex].items[item.itemIndex].details[item.detailIndex].media[item.mediaIndex];
                                                                 
                                                                 // Remover do local atual
                                                                 if (item.isNC) {
                                                                   const updatedNCs = [...inspection.topics[item.topicIndex].items[item.itemIndex].details[item.detailIndex].non_conformities];
                                                                   updatedNCs[item.ncIndex].media.splice(item.mediaIndex, 1);
                                                                   updateDetailField(item.topicIndex, item.itemIndex, item.detailIndex, 'non_conformities', updatedNCs);
                                                                 } else {
                                                                   const updatedMedia = [...inspection.topics[item.topicIndex].items[item.itemIndex].details[item.detailIndex].media];
                                                                   updatedMedia.splice(item.mediaIndex, 1);
                                                                   updateDetailField(item.topicIndex, item.itemIndex, item.detailIndex, 'media', updatedMedia);
                                                                 }
                                                                 
                                                                 // Adicionar ao destino
                                                                 const updatedNCs = [...inspection.topics[topicIndex].items[itemIndex].details[detailIndex].non_conformities];
                                                                 if (!updatedNCs[ncIndex].media) {
                                                                   updatedNCs[ncIndex].media = [];
                                                                 }
                                                                 updatedNCs[ncIndex].media.push(targetMedia);
                                                                 updateDetailField(topicIndex, itemIndex, detailIndex, 'non_conformities', updatedNCs);
                                                               },
                                                             })();
                                                             drop(dropFn);
                                                           }}
                                                           className="border-2 border-dashed rounded-md p-1 h-[40px] flex items-center justify-center mt-1"
                                                         >
                                                           <p className="text-xs text-muted-foreground">Arraste uma mídia para cá</p>
                                                         </div>
                                                       )}
                                                     </div>
                                                   </CardContent>
                                                 </Card>
                                               ))}
                                             </div>
                                           </div>
                                         )}
                                       </CardContent>
                                     </Card>
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
     
     {/* Media Viewer Dialog */}
     {viewerOpen && selectedMedia && (
       <Dialog open={viewerOpen} onOpenChange={() => setViewerOpen(false)} className="max-w-4xl">
         <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col">
           <div className="flex items-center justify-between p-3 border-b">
             <h3 className="text-sm font-medium">Visualizador de Mídia</h3>
             <div className="flex gap-1">
               <Button variant="outline" size="sm" className="h-7" onClick={() => rotateImage('left')}>
                 <RotateCcw className="h-3 w-3" />
               </Button>
               <Button variant="outline" size="sm" className="h-7" onClick={() => rotateImage('right')}>
                 <RotateCw className="h-3 w-3" />
               </Button>
               <Button variant="outline" size="sm" className="h-7" onClick={() => setShowMoveDialog(true)}>
                 <Move className="mr-1 h-3 w-3" />
                 <span className="text-xs">Mover</span>
               </Button>
               <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setViewerOpen(false)}>
                 <X className="h-3 w-3" />
               </Button>
             </div>
           </div>
           
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
       <Dialog open={showMoveDialog} onOpenChange={() => setShowMoveDialog(false)}>
         <DialogContent className="max-w-xl max-h-[80vh]">
           <DialogHeader>
             <DialogTitle className="text-base">Mover Mídia</DialogTitle>
           </DialogHeader>
           
           <ScrollArea className="h-[60vh] pr-4 mt-2">
             <div className="space-y-2">
               {inspection.topics.map((topic, topicIndex) => (
                 <div key={topicIndex} className="border rounded-md">
                   <div 
                     className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50"
                     onClick={() => {
                       if (moveDialogExpandedTopics.includes(topicIndex)) {
                         setMoveDialogExpandedTopics(moveDialogExpandedTopics.filter(i => i !== topicIndex));
                       } else {
                         setMoveDialogExpandedTopics([...moveDialogExpandedTopics, topicIndex]);
                       }
                     }}
                   >
                     <div className="flex items-center gap-2 text-sm font-medium">
                       {moveDialogExpandedTopics.includes(topicIndex) ? 
                         <ChevronDown className="h-4 w-4" /> : 
                         <ChevronRight className="h-4 w-4" />}
                       {topic.name || `Tópico ${topicIndex + 1}`}
                     </div>
                   </div>
                   
                   {moveDialogExpandedTopics.includes(topicIndex) && (
                     <div className="pl-4 pr-2 pb-2 space-y-1">
                       {topic.items.map((item, itemIndex) => (
                         <div key={itemIndex} className="border rounded-md">
                           <div 
                             className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50"
                             onClick={() => {
                               const key = `${topicIndex}-${itemIndex}`;
                               if (moveDialogExpandedItems.includes(key)) {
                                 setMoveDialogExpandedItems(moveDialogExpandedItems.filter(i => i !== key));
                               } else {
                                 setMoveDialogExpandedItems([...moveDialogExpandedItems, key]);
                               }
                             }}
                           >
                             <div className="flex items-center gap-2 text-xs">
                               {moveDialogExpandedItems.includes(`${topicIndex}-${itemIndex}`) ? 
                                 <ChevronDown className="h-3 w-3" /> : 
                                 <ChevronRight className="h-3 w-3" />}
                               {item.name || `Item ${itemIndex + 1}`}
                             </div>
                           </div>
                           
                           {moveDialogExpandedItems.includes(`${topicIndex}-${itemIndex}`) && (
                             <div className="pl-4 pr-2 pb-2 space-y-1">
                               {item.details.map((detail, detailIndex) => (
                                 <div 
                                   key={detailIndex} 
                                   className={`p-2 border rounded-md cursor-pointer hover:bg-gray-50 ${
                                     moveTarget && 
                                     moveTarget.topicIndex === topicIndex &&
                                     moveTarget.itemIndex === itemIndex &&
                                     moveTarget.detailIndex === detailIndex &&
                                     !moveTarget.ncIndex
                                       ? 'bg-blue-50 border-blue-300'
                                       : ''
                                   }`}
                                   onClick={() => {
                                     setMoveTarget({
                                       topicIndex, 
                                       itemIndex, 
                                       detailIndex
                                     });
                                   }}
                                 >
                                   <div className="flex items-center justify-between">
                                     <div className="text-xs">{detail.name || `Detalhe ${detailIndex + 1}`}</div>
                                     <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                       {detail.media?.length > 0 && (
                                         <div className="flex items-center">
                                           <Image className="h-3 w-3 mr-1" />
                                           {detail.media.filter(m => m.type === 'image').length}
                                         </div>
                                       )}
                                       {detail.media?.filter(m => m.type === 'video').length > 0 && (
                                         <div className="flex items-center ml-1">
                                           <Video className="h-3 w-3 mr-1" />
                                           {detail.media.filter(m => m.type === 'video').length}
                                         </div>
                                       )}
                                     </div>
                                   </div>
                                   
                                   {/* NC options for moving */}
                                   {detail.non_conformities && detail.non_conformities.length > 0 && (
                                     <div className="mt-2 pl-3 space-y-1 border-l-2 border-l-red-200">
                                       {detail.non_conformities.map((nc, ncIndex) => (
                                         <div 
                                           key={ncIndex}
                                           className={`p-1 border rounded-sm cursor-pointer hover:bg-gray-50 ${
                                             moveTarget && 
                                             moveTarget.topicIndex === topicIndex &&
                                             moveTarget.itemIndex === itemIndex &&
                                             moveTarget.detailIndex === detailIndex &&
                                             moveTarget.ncIndex === ncIndex
                                               ? 'bg-blue-50 border-blue-300'
                                               : ''
                                           }`}
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             setMoveTarget({
                                               topicIndex, 
                                               itemIndex, 
                                               detailIndex,
                                               ncIndex
                                             });
                                           }}
                                         >
                                           <div className="flex items-center justify-between">
                                             <div className="text-xs">NC {ncIndex + 1}</div>
                                             <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                               {nc.media?.length > 0 && (
                                                 <div className="flex items-center">
                                                   <Image className="h-2 w-2 mr-1" />
                                                   {nc.media.filter(m => m.type === 'image').length}
                                                 </div>
                                               )}
                                             </div>
                                           </div>
                                         </div>
                                       ))}
                                     </div>
                                   )}
                                 </div>
                               ))}
                             </div>
                           )}
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
               ))}
             </div>
           </ScrollArea>
           
           <div className="flex justify-end gap-2 mt-2 pt-2 border-t">
             <Button variant="outline" size="sm" onClick={() => setShowMoveDialog(false)}>Cancelar</Button>
             <Button size="sm" onClick={handleMoveMedia} disabled={!moveTarget}>
               Mover para o Destino Selecionado
             </Button>
           </div>
         </DialogContent>
       </Dialog>
     )}
   </div>
 </DndProvider>
);
}