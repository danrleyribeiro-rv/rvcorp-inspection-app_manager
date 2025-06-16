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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, ListChecks } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { addWatermarkToImage, detectImageSource } from "@/utils/ImageWatermark";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  ChevronRight,
  Video,
  Images
} from "lucide-react";
import DetailEditor from "@/components/inspection/DetailEditor";
import MediaMoveDialog from "@/components/inspection/MediaMoveDialog";
import InspectionControlPanel from "@/components/inspection/InspectionControlPanel";
import MediaManagementTab from "@/components/inspection/MediaManagementTab";
import { UniversalDropZone, DRAG_TYPES } from "@/components/inspection/EnhancedDragDropProvider";
import UniversalMediaSection from "@/components/inspection/UniversalMediaSection";
import { DraggableTopic, DraggableItem } from "@/components/inspection/DraggableStructureItem";

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
  const [activeTab, setActiveTab] = useState("general");
  const [inspectionControlData, setInspectionControlData] = useState(null);
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

  const uploadMedia = async (topicIndex, itemIndex, detailIndex, file, isNC = false, ncIndex = null, isFromCamera = false) => {
    try {
      const fileExtension = file.name.split('.').pop();
      const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
      const timestamp = Date.now();
      const fileName = `${mediaType}_${timestamp}.${fileExtension}`;
      
      let storagePath;
      if (isNC && ncIndex !== null) {
        storagePath = `inspections/${inspectionId}/topic_${topicIndex}/item_${itemIndex}/detail_${detailIndex}/non_conformities/nc_${ncIndex}/${fileName}`;
      } else if (detailIndex !== null) {
        storagePath = `inspections/${inspectionId}/topic_${topicIndex}/item_${itemIndex}/detail_${detailIndex}/media/${fileName}`;
      } else if (itemIndex !== null) {
        storagePath = `inspections/${inspectionId}/topic_${topicIndex}/item_${itemIndex}/media/${fileName}`;
      } else {
        storagePath = `inspections/${inspectionId}/topic_${topicIndex}/media/${fileName}`;
      }
      
      let fileToUpload = file;
      let url;
      
      if (mediaType === 'image') {
        const fileURL = URL.createObjectURL(file);
        const imageSource = detectImageSource(file, isFromCamera);
        const watermarkedImageURL = await addWatermarkToImage(fileURL, inspectionId, imageSource);
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
        
        if (isNC && ncIndex !== null) {
          if (!updated.topics[topicIndex].items[itemIndex].details[detailIndex].non_conformities[ncIndex].media) {
            updated.topics[topicIndex].items[itemIndex].details[detailIndex].non_conformities[ncIndex].media = [];
          }
          updated.topics[topicIndex].items[itemIndex].details[detailIndex].non_conformities[ncIndex].media.push(mediaObject);
        } else if (detailIndex !== null) {
          if (!updated.topics[topicIndex].items[itemIndex].details[detailIndex].media) {
            updated.topics[topicIndex].items[itemIndex].details[detailIndex].media = [];
          }
          updated.topics[topicIndex].items[itemIndex].details[detailIndex].media.push(mediaObject);
        } else if (itemIndex !== null) {
          if (!updated.topics[topicIndex].items[itemIndex].media) {
            updated.topics[topicIndex].items[itemIndex].media = [];
          }
          updated.topics[topicIndex].items[itemIndex].media.push(mediaObject);
        } else {
          if (!updated.topics[topicIndex].media) {
            updated.topics[topicIndex].media = [];
          }
          updated.topics[topicIndex].media.push(mediaObject);
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

  const formatFirestoreDate = (timestamp) => {
    if (!timestamp) return "Não informado";
    
    try {
      let date;
      
      // Se é um Firestore Timestamp
      if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      }
      // Se é uma string ISO
      else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      }
      // Se já é um objeto Date
      else if (timestamp instanceof Date) {
        date = timestamp;
      }
      // Se tem seconds (formato Firestore)
      else if (timestamp && timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      }
      else {
        return "Data inválida";
      }

      // Verifica se a data é válida
      if (isNaN(date.getTime())) {
        return "Data inválida";
      }

      return date.toLocaleString('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Erro ao formatar data:', error, timestamp);
      return "Data inválida";
    }
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
          items: [],
          media: []
        }
      ]
    }));
  };

  const duplicateTopic = (topicIndex) => {
    const topicToDuplicate = inspection.topics[topicIndex];
    const duplicatedTopic = {
      ...structuredClone(topicToDuplicate),
      name: `${topicToDuplicate.name} (Cópia)`,
    };
    
    setInspection(prev => ({
      ...prev,
      topics: [
        ...prev.topics.slice(0, topicIndex + 1),
        duplicatedTopic,
        ...prev.topics.slice(topicIndex + 1)
      ]
    }));
  };

  const reorderTopic = (topicIndex, direction) => {
    const newIndex = topicIndex + direction;
    if (newIndex < 0 || newIndex >= inspection.topics.length) return;
    
    setInspection(prev => {
      const newTopics = [...prev.topics];
      [newTopics[topicIndex], newTopics[newIndex]] = [newTopics[newIndex], newTopics[topicIndex]];
      return { ...prev, topics: newTopics };
    });
    
    // Update active topic index
    if (activeTopicIndex === topicIndex) {
      setActiveTopicIndex(newIndex);
    } else if (activeTopicIndex === newIndex) {
      setActiveTopicIndex(topicIndex);
    }
  };

  const removeTopic = (topicIndex) => {
    setInspection(prev => {
      const updatedTopics = prev.topics.filter((_, index) => index !== topicIndex);
      
      // Adjust active topic index if needed
      if (activeTopicIndex >= updatedTopics.length - 1) {
        setActiveTopicIndex(Math.max(0, updatedTopics.length - 2));
      }
      
      return {
        ...prev,
        topics: updatedTopics
      };
    });
    
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
                  details: [],
                  media: []
                }
              ]
            }
          : topic
      )
    }));
  };

  const duplicateItem = (topicIndex, itemIndex) => {
    const itemToDuplicate = inspection.topics[topicIndex].items[itemIndex];
    const duplicatedItem = {
      ...structuredClone(itemToDuplicate),
      name: `${itemToDuplicate.name} (Cópia)`,
    };
    
    setInspection(prev => ({
      ...prev,
      topics: prev.topics.map((topic, tIndex) =>
        tIndex === topicIndex
          ? {
              ...topic,
              items: [
                ...topic.items.slice(0, itemIndex + 1),
                duplicatedItem,
                ...topic.items.slice(itemIndex + 1)
              ]
            }
          : topic
      )
    }));
  };

  const reorderItem = (topicIndex, itemIndex, direction) => {
    const topic = inspection.topics[topicIndex];
    const newIndex = itemIndex + direction;
    if (newIndex < 0 || newIndex >= topic.items.length) return;
    
    setInspection(prev => ({
      ...prev,
      topics: prev.topics.map((topic, tIndex) =>
        tIndex === topicIndex
          ? {
              ...topic,
              items: (() => {
                const newItems = [...topic.items];
                [newItems[itemIndex], newItems[newIndex]] = [newItems[newIndex], newItems[itemIndex]];
                return newItems;
              })()
            }
          : topic
      )
    }));
    
    // Update active item index
    if (activeItemIndex === itemIndex) {
      setActiveItemIndex(newIndex);
    } else if (activeItemIndex === newIndex) {
      setActiveItemIndex(itemIndex);
    }
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

  const duplicateDetail = (topicIndex, itemIndex, detailIndex) => {
    const detailToDuplicate = inspection.topics[topicIndex].items[itemIndex].details[detailIndex];
    const duplicatedDetail = {
      ...structuredClone(detailToDuplicate),
      name: `${detailToDuplicate.name} (Cópia)`,
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
                      details: [
                        ...item.details.slice(0, detailIndex + 1),
                        duplicatedDetail,
                        ...item.details.slice(detailIndex + 1)
                      ]
                    }
                  : item
              )
            }
          : topic
      )
    }));
  };

  const reorderDetail = (topicIndex, itemIndex, detailIndex, direction) => {
    const item = inspection.topics[topicIndex].items[itemIndex];
    const newIndex = detailIndex + direction;
    if (newIndex < 0 || newIndex >= item.details.length) return;
    
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
                      details: (() => {
                        const newDetails = [...item.details];
                        [newDetails[detailIndex], newDetails[newIndex]] = [newDetails[newIndex], newDetails[detailIndex]];
                        return newDetails;
                      })()
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
  const { topicIndex: srcTopicIndex, itemIndex: srcItemIndex, 
          detailIndex: srcDetailIndex, mediaIndex: srcMediaIndex, 
          isNC: srcIsNC, ncIndex: srcNcIndex } = item;
          
  const { topicIndex: destTopicIndex, itemIndex: destItemIndex, 
          detailIndex: destDetailIndex, ncIndex: destNcIndex } = destination;
  
  const updatedInspection = structuredClone(inspection);
  
  // Verificar se todos os índices são válidos antes de acessar
  if (!updatedInspection.topics?.[srcTopicIndex]) return;
  
  // Remove media from source
  let mediaToMove;
  
  try {
    if (srcIsNC && srcNcIndex !== null) {
      const srcTopic = updatedInspection.topics[srcTopicIndex];
      const srcItem = srcTopic.items?.[srcItemIndex];
      const srcDetail = srcItem?.details?.[srcDetailIndex];
      const srcNc = srcDetail?.non_conformities?.[srcNcIndex];
      
      if (!srcNc?.media?.[srcMediaIndex]) return;
      
      mediaToMove = srcNc.media[srcMediaIndex];
      srcNc.media.splice(srcMediaIndex, 1);
    } else if (srcDetailIndex !== null) {
      const srcTopic = updatedInspection.topics[srcTopicIndex];
      const srcItem = srcTopic.items?.[srcItemIndex];
      const srcDetail = srcItem?.details?.[srcDetailIndex];
      
      if (!srcDetail?.media?.[srcMediaIndex]) return;
      
      mediaToMove = srcDetail.media[srcMediaIndex];
      srcDetail.media.splice(srcMediaIndex, 1);
    } else if (srcItemIndex !== null) {
      const srcTopic = updatedInspection.topics[srcTopicIndex];
      const srcItem = srcTopic.items?.[srcItemIndex];
      
      if (!srcItem?.media?.[srcMediaIndex]) return;
      
      mediaToMove = srcItem.media[srcMediaIndex];
      srcItem.media.splice(srcMediaIndex, 1);
    } else {
      const srcTopic = updatedInspection.topics[srcTopicIndex];
      
      if (!srcTopic?.media?.[srcMediaIndex]) return;
      
      mediaToMove = srcTopic.media[srcMediaIndex];
      srcTopic.media.splice(srcMediaIndex, 1);
    }
    
    if (!mediaToMove) return;
    
    // Add media to destination
    if (destNcIndex !== null) {
      const destTopic = updatedInspection.topics[destTopicIndex];
      const destItem = destTopic.items?.[destItemIndex];
      const destDetail = destItem?.details?.[destDetailIndex];
      const destNc = destDetail?.non_conformities?.[destNcIndex];
      
      if (!destNc) return;
      if (!destNc.media) destNc.media = [];
      
      destNc.media.push(mediaToMove);
    } else if (destDetailIndex !== null) {
      const destTopic = updatedInspection.topics[destTopicIndex];
      const destItem = destTopic.items?.[destItemIndex];
      const destDetail = destItem?.details?.[destDetailIndex];
      
      if (!destDetail) return;
      if (!destDetail.media) destDetail.media = [];
      
      destDetail.media.push(mediaToMove);
    } else if (destItemIndex !== null) {
      const destTopic = updatedInspection.topics[destTopicIndex];
      const destItem = destTopic.items?.[destItemIndex];
      
      if (!destItem) return;
      if (!destItem.media) destItem.media = [];
      
      destItem.media.push(mediaToMove);
    } else {
      const destTopic = updatedInspection.topics[destTopicIndex];
      
      if (!destTopic) return;
      if (!destTopic.media) destTopic.media = [];
      
      destTopic.media.push(mediaToMove);
    }
    
    setInspection(updatedInspection);
    toast({
      title: "Mídia movida",
      description: "A mídia foi movida com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao mover mídia:", error);
    toast({
      title: "Erro",
      description: "Não foi possível mover a mídia.",
      variant: "destructive",
    });
  }
};

  const handleMoveStructure = (item, destination) => {
    const updatedInspection = structuredClone(inspection);
    
    // Helper function to create new structure based on destination level
    const convertToDestinationLevel = (sourceData, destinationLevel) => {
      if (destinationLevel === 'topic') {
        return {
          name: sourceData.name || "Novo Tópico",
          description: sourceData.description || "",
          observation: sourceData.observation || "",
          items: [],
          media: sourceData.media || []
        };
      } else if (destinationLevel === 'item') {
        return {
          name: sourceData.name || "Novo Item",
          description: sourceData.description || "",
          observation: sourceData.observation || "",
          details: sourceData.details || [],
          media: sourceData.media || []
        };
      } else if (destinationLevel === 'detail') {
        return {
          name: sourceData.name || "Novo Detalhe",
          description: sourceData.description || "",
          observation: sourceData.observation || "",
          type: sourceData.type || "text",
          value: sourceData.value || "",
          unit: sourceData.unit || "",
          options: sourceData.options || [],
          required: sourceData.required || false,
          media: sourceData.media || [],
          non_conformities: sourceData.non_conformities || []
        };
      }
    };

    // Remove item from source
    let sourceData;
    if (item.type === DRAG_TYPES.TOPIC) {
      [sourceData] = updatedInspection.topics.splice(item.topicIndex, 1);
    } else if (item.type === DRAG_TYPES.ITEM) {
      [sourceData] = updatedInspection.topics[item.topicIndex].items.splice(item.itemIndex, 1);
    } else if (item.type === DRAG_TYPES.DETAIL) {
      [sourceData] = updatedInspection.topics[item.topicIndex].items[item.itemIndex].details.splice(item.detailIndex, 1);
    }

    // Convert and insert at destination
    if (destination.level === 'topic') {
      const convertedData = item.type === DRAG_TYPES.TOPIC ? sourceData : convertToDestinationLevel(sourceData, 'topic');
      const insertIndex = destination.topicIndex !== undefined ? destination.topicIndex : updatedInspection.topics.length;
      updatedInspection.topics.splice(insertIndex, 0, convertedData);
      
      // Update active topic if needed
      if (item.type === DRAG_TYPES.TOPIC && activeTopicIndex === item.topicIndex) {
        setActiveTopicIndex(insertIndex);
      }
      
    } else if (destination.level === 'item') {
      const convertedData = item.type === DRAG_TYPES.ITEM ? sourceData : convertToDestinationLevel(sourceData, 'item');
      
      if (!updatedInspection.topics[destination.topicIndex].items) {
        updatedInspection.topics[destination.topicIndex].items = [];
      }
      
      const insertIndex = destination.itemIndex !== undefined ? destination.itemIndex : 
                         updatedInspection.topics[destination.topicIndex].items.length;
      updatedInspection.topics[destination.topicIndex].items.splice(insertIndex, 0, convertedData);
      
      // Update active item if needed
      if (item.type === DRAG_TYPES.ITEM && activeItemIndex === item.itemIndex && activeTopicIndex === item.topicIndex) {
        setActiveItemIndex(insertIndex);
        setActiveTopicIndex(destination.topicIndex);
      }
      
    } else if (destination.level === 'detail') {
      const convertedData = item.type === DRAG_TYPES.DETAIL ? sourceData : convertToDestinationLevel(sourceData, 'detail');
      
      if (!updatedInspection.topics[destination.topicIndex].items[destination.itemIndex].details) {
        updatedInspection.topics[destination.topicIndex].items[destination.itemIndex].details = [];
      }
      
      const insertIndex = destination.detailIndex !== undefined ? destination.detailIndex : 
                         updatedInspection.topics[destination.topicIndex].items[destination.itemIndex].details.length;
      updatedInspection.topics[destination.topicIndex].items[destination.itemIndex].details.splice(insertIndex, 0, convertedData);
    }
    
    setInspection(updatedInspection);
    
    toast({
      title: "Estrutura movida com sucesso"
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
      setInspection(prev => {
        const updated = structuredClone(prev);
        
        if (isNC && ncIndex !== null) {
          updated.topics[topicIndex].items[itemIndex].details[detailIndex].non_conformities[ncIndex].media.splice(mediaIndex, 1);
        } else if (detailIndex !== null) {
          updated.topics[topicIndex].items[itemIndex].details[detailIndex].media.splice(mediaIndex, 1);
        } else if (itemIndex !== null) {
          updated.topics[topicIndex].items[itemIndex].media.splice(mediaIndex, 1);
        } else {
          updated.topics[topicIndex].media.splice(mediaIndex, 1);
        }
        
        return updated;
      });

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

  useEffect(() => {
    if (inspection) {
      setInspectionControlData({
        ...inspection,
        delivered: inspection.delivered || false,
        delivered_at: inspection.delivered_at || null,
        inspection_edit_blocked: inspection.inspection_edit_blocked || false,
        last_editor: inspection.last_editor || null
      });
    }
  }, [inspection]);

  // Função para atualizar dados de controle
  const handleControlUpdate = async () => {
    await fetchInspection();
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="mb-4">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Informações Gerais
              </TabsTrigger>
              <TabsTrigger value="topics" className="flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                Estrutura da Inspeção
              </TabsTrigger>
              <TabsTrigger value="media" className="flex items-center gap-2">
                <Images className="h-4 w-4" />
                Mídias
              </TabsTrigger>
              <TabsTrigger value="control" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Controle
              </TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="space-y-4">
              <div className="bg-card border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Informações Básicas</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="title">Título da Inspeção</Label>
                    <Input
                      id="title"
                      value={inspection?.title || ''}
                      onChange={e => updateInspectionField('title', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="area">Metragem (m²)</Label>
                    <Input
                      id="area"
                      type="number"
                      min="0"
                      step="1.0"
                      value={inspection?.area || ''}
                      onChange={e => updateInspectionField('area', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <Label htmlFor="observation">Observações</Label>
                  <Textarea
                    id="observation"
                    value={inspection?.observation || ''}
                    onChange={e => updateInspectionField('observation', e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Data de Criação</Label>
                    <Input
                      value={formatFirestoreDate(inspection?.created_at)}
                      disabled
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Última Atualização</Label>
                    <Input
                      value={formatFirestoreDate(inspection?.updated_at)}
                      disabled
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

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
                        <UniversalDropZone
                          key={topicIndex}
                          topicIndex={topicIndex}
                          onDropMedia={handleMoveMediaDrop}
                          onDropTopic={handleMoveStructure}
                          onDropItem={handleMoveStructure}
                          onDropDetail={handleMoveStructure}
                          acceptTypes={[DRAG_TYPES.MEDIA, DRAG_TYPES.TOPIC, DRAG_TYPES.ITEM, DRAG_TYPES.DETAIL]}
                          hasContent={topic.media?.length > 0 || topic.items?.length > 0}
                        >
                          <DraggableTopic
                            topic={topic}
                            topicIndex={topicIndex}
                            isActive={activeTopicIndex === topicIndex}
                            onReorder={reorderTopic}
                            onDuplicate={duplicateTopic}
                            onRemove={removeTopic}
                          >
                            <div
                              className={`p-2 rounded cursor-pointer border space-y-2 ${
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
                              
                              <div className="flex items-center justify-between text-xs opacity-70">
                                {topic.items?.length > 0 && (
                                  <span>
                                    {topic.items.length} ite{topic.items.length !== 1 ? 'ns' : 'm'}
                                  </span>
                                )}
                                {topic.media?.length > 0 && (
                                  <span>
                                    {topic.media.length} mídia{topic.media.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              
                              {/* Topic Media Grid */}
                              {topic.media?.length > 0 && (
                                <div className="grid grid-cols-4 gap-1" onClick={(e) => e.stopPropagation()}>
                                  {topic.media.map((mediaItem, mediaIndex) => (
                                    <div
                                      key={mediaIndex}
                                      className="aspect-square border rounded overflow-hidden bg-gray-50 cursor-pointer hover:opacity-80"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openMediaViewer(mediaItem, topicIndex, null, null, mediaIndex);
                                      }}
                                    >
                                      {mediaItem.type === 'image' ? (
                                        <img
                                          src={mediaItem.url}
                                          alt="Topic Media"
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                          <Video className="h-4 w-4 text-gray-400" />
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Topic Observation */}
                              {topic.observation && (
                                <div className="text-xs text-muted-foreground bg-accent/20 p-2 rounded border-l-2 border-primary/20" onClick={(e) => e.stopPropagation()}>
                                  <div className="font-medium mb-1">Observação:</div>
                                  <div className="line-clamp-2">{topic.observation}</div>
                                </div>
                              )}
                            </div>
                          </DraggableTopic>
                        </UniversalDropZone>
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
                         
                         {/* Topic Media Upload Section */}
                         <div>
                           <UniversalMediaSection
                             media={[]}
                             level="topic"
                             topicIndex={activeTopicIndex}
                             onUpload={uploadMedia}
                             onRemove={removeMedia}
                             onMove={openMoveDialog}
                             onView={openMediaViewer}
                             onMoveMediaDrop={handleMoveMediaDrop}
                             title="Adicionar Mídia ao Tópico"
                           />
                         </div>
                       </div>
                       
                       {/* Items list */}
                       <div className="space-y-1">
                         {currentTopic.items?.map((item, itemIndex) => (
                           <UniversalDropZone
                             key={itemIndex}
                             topicIndex={activeTopicIndex}
                             itemIndex={itemIndex}
                             onDropMedia={handleMoveMediaDrop}
                             onDropTopic={handleMoveStructure}
                             onDropItem={handleMoveStructure}
                             onDropDetail={handleMoveStructure}
                             acceptTypes={[DRAG_TYPES.MEDIA, DRAG_TYPES.TOPIC, DRAG_TYPES.ITEM, DRAG_TYPES.DETAIL]}
                             hasContent={item.media?.length > 0 || item.details?.length > 0}
                           >
                             <DraggableItem
                               item={item}
                               topicIndex={activeTopicIndex}
                               itemIndex={itemIndex}
                               isActive={activeItemIndex === itemIndex}
                               onReorder={reorderItem}
                               onDuplicate={duplicateItem}
                               onRemove={removeItem}
                             >
                               <div className="space-y-2">
                                 <div
                                   className={`p-2 rounded cursor-pointer border space-y-2 ${
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
                                 
                                 <div className="flex items-center justify-between text-xs opacity-70">
                                   {item.details?.length > 0 && (
                                     <span>
                                       {item.details.length} detalhe{item.details.length !== 1 ? 's' : ''}
                                     </span>
                                   )}
                                   {item.media?.length > 0 && (
                                     <span>
                                       {item.media.length} mídia{item.media.length !== 1 ? 's' : ''}
                                     </span>
                                   )}
                                 </div>
                                 
                                 {/* Item Media Grid */}
                                 {item.media?.length > 0 && (
                                   <div className="grid grid-cols-3 gap-1" onClick={(e) => e.stopPropagation()}>
                                     {item.media.map((mediaItem, mediaIndex) => (
                                       <div
                                         key={mediaIndex}
                                         className="aspect-square border rounded overflow-hidden bg-gray-50 cursor-pointer hover:opacity-80"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           openMediaViewer(mediaItem, activeTopicIndex, itemIndex, null, mediaIndex);
                                         }}
                                       >
                                         {mediaItem.type === 'image' ? (
                                           <img
                                             src={mediaItem.url}
                                             alt="Item Media"
                                             className="w-full h-full object-cover"
                                           />
                                         ) : (
                                           <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                             <Video className="h-4 w-4 text-gray-400" />
                                           </div>
                                         )}
                                       </div>
                                     ))}
                                   </div>
                                 )}
                               </div>
                               
                               {/* Item Media Upload Section - show when item is selected */}
                               {activeItemIndex === itemIndex && (
                                 <div className="px-2">
                                   <UniversalMediaSection
                                     media={[]}
                                     level="item"
                                     topicIndex={activeTopicIndex}
                                     itemIndex={itemIndex}
                                     onUpload={uploadMedia}
                                     onRemove={removeMedia}
                                     onMove={openMoveDialog}
                                     onView={openMediaViewer}
                                     onMoveMediaDrop={handleMoveMediaDrop}
                                     title="Adicionar Mídia ao Item"
                                   />
                                 </div>
                               )}
                               </div>
                             </DraggableItem>
                           </UniversalDropZone>
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
                             onReorderDetail={reorderDetail}
                             onDuplicateDetail={duplicateDetail}
                             onMoveStructureDrop={handleMoveStructure}
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

           <TabsContent value="media" className="space-y-4">
             <MediaManagementTab
               inspection={inspection}
               onUploadMedia={uploadMedia}
               onRemoveMedia={removeMedia}
               onMoveMedia={handleMoveMediaDrop}
               onViewMedia={openMediaViewer}
               onMoveDialog={openMoveDialog}
               onUpdateInspection={setInspection}
             />
           </TabsContent>

           {/* Novo conteúdo da aba Controle */}
           <TabsContent value="control" className="space-y-4">
              {inspectionControlData && (
                <InspectionControlPanel 
                  inspection={inspectionControlData}
                  onUpdate={handleControlUpdate}
                />
              )}
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