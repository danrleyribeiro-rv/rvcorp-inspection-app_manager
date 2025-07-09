import React, { useState, useCallback, useMemo } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { 
  Images, 
  FileImage, 
  Video, 
  AlertTriangle, 
  Droplets,
  CheckCircle,
  Clock,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import DraggableMediaItem from "@/components/inspection/DraggableMedia";
import { UniversalDropZone, DRAG_TYPES } from "@/components/inspection/EnhancedDragDropProvider";
import { 
  addWatermarkToImage, 
  detectImageSource, 
  dataURLtoFile, 
  hasWatermark 
} from "@/utils/ImageWatermark";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function MediaManagementTab({
  inspection,
  onUploadMedia,
  onRemoveMedia,
  onMoveMedia,
  onViewMedia,
  onMoveDialog,
  onUpdateInspection
}) {
  const { toast } = useToast();
  const [collapsedSections, setCollapsedSections] = useState({});

  const toggleSection = (sectionId) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };
  
  // Estados
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const [activeItemIndex, setActiveItemIndex] = useState(null);
  const [isWatermarkDialog, setIsWatermarkDialog] = useState(false);
  const [selectedMediaForWatermark, setSelectedMediaForWatermark] = useState(null);
  const [isApplyingWatermark, setIsApplyingWatermark] = useState(false);
  const [isBulkWatermark, setIsBulkWatermark] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  // Calcular estatísticas de mídia
  const mediaStats = useMemo(() => {
    let totalImages = 0;
    let totalVideos = 0;
    let imagesWithoutWatermark = 0;

    const processMedia = (mediaArray) => {
      mediaArray?.forEach(media => {
        if (media.type === 'image') {
          totalImages++;
          if (!hasWatermark(media)) {
            imagesWithoutWatermark++;
          }
        } else if (media.type === 'video') {
          totalVideos++;
        }
      });
    };

    inspection?.topics?.forEach(topic => {
      // Mídia do tópico
      processMedia(topic.media);
      
      // Mídia dos itens
      topic.items?.forEach(item => {
        processMedia(item.media);
        
        // Mídia dos detalhes
        item.details?.forEach(detail => {
          processMedia(detail.media);
          
          // Mídia das não conformidades
          detail.non_conformities?.forEach(nc => {
            processMedia(nc.media);
          });
        });
      });
    });

    return {
      total: totalImages + totalVideos,
      totalImages,
      totalVideos,
      imagesWithoutWatermark
    };
  }, [inspection]);

  // Tópico e item atuais
  const currentTopic = inspection?.topics?.[activeTopicIndex];
  const currentItem = currentTopic?.items?.[activeItemIndex];

  // Manipuladores de eventos
  const handleViewMedia = useCallback((media, context) => {
    onViewMedia(media, context);
  }, [onViewMedia]);

  const handleMoveMedia = useCallback((media, context) => {
    onMoveDialog(media, context);
  }, [onMoveDialog]);

  const handleRemoveMedia = useCallback((media, context) => {
    onRemoveMedia(media, context);
  }, [onRemoveMedia]);

  const handleWatermark = useCallback((media, context) => {
    if (hasWatermark(media)) {
      toast({
        title: "Aviso",
        description: "Esta imagem já possui marca d'água",
        variant: "default"
      });
      return;
    }

    setSelectedMediaForWatermark({ media, context });
    setIsWatermarkDialog(true);
  }, [toast]);

  // Aplicar marca d'água em uma imagem
  const applyWatermark = useCallback(async () => {
    if (!selectedMediaForWatermark) return;

    setIsApplyingWatermark(true);

    try {
      const { media, context } = selectedMediaForWatermark;
      
      console.log("Aplicando marca d'água para:", media.url);
      
      // Detectar origem da imagem
      const imageSource = detectImageSource(null, false);
      
      // Aplicar marca d'água
      const watermarkedDataURL = await addWatermarkToImage(
        media.url, 
        inspection.id, 
        imageSource
      );
      
      // Criar arquivo da imagem com marca d'água
      const timestamp = Date.now();
      const fileName = `image_watermarked_${timestamp}.jpg`;
      const watermarkedFile = dataURLtoFile(watermarkedDataURL, fileName);
      
      // Definir caminho de armazenamento
      let storagePath;
      if (context.isNC && context.ncIndex !== null) {
        storagePath = `inspections/${inspection.id}/topic_${context.topicIndex}/item_${context.itemIndex}/detail_${context.detailIndex}/non_conformities/nc_${context.ncIndex}/${fileName}`;
      } else if (context.detailIndex !== null) {
        storagePath = `inspections/${inspection.id}/topic_${context.topicIndex}/item_${context.itemIndex}/detail_${context.detailIndex}/media/${fileName}`;
      } else if (context.itemIndex !== null) {
        storagePath = `inspections/${inspection.id}/topic_${context.topicIndex}/item_${context.itemIndex}/media/${fileName}`;
      } else {
        storagePath = `inspections/${inspection.id}/topic_${context.topicIndex}/media/${fileName}`;
      }

      // Upload para Firebase
      const storageRef = ref(storage, storagePath);
      const uploadResult = await uploadBytes(storageRef, watermarkedFile);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      // Atualizar dados da inspeção
      const updatedInspection = { ...inspection };
      
      if (context.isNC && context.ncIndex !== null) {
        updatedInspection.topics[context.topicIndex].items[context.itemIndex]
          .details[context.detailIndex].non_conformities[context.ncIndex]
          .media[context.mediaIndex] = {
            ...media,
            url: downloadURL,
            id: `watermarked_${media.id}`,
            updated_at: new Date().toISOString()
          };
      } else if (context.detailIndex !== null) {
        updatedInspection.topics[context.topicIndex].items[context.itemIndex]
          .details[context.detailIndex].media[context.mediaIndex] = {
            ...media,
            url: downloadURL,
            id: `watermarked_${media.id}`,
            updated_at: new Date().toISOString()
          };
      } else if (context.itemIndex !== null) {
        updatedInspection.topics[context.topicIndex].items[context.itemIndex]
          .media[context.mediaIndex] = {
            ...media,
            url: downloadURL,
            id: `watermarked_${media.id}`,
            updated_at: new Date().toISOString()
          };
      } else {
        updatedInspection.topics[context.topicIndex].media[context.mediaIndex] = {
          ...media,
          url: downloadURL,
          id: `watermarked_${media.id}`,
          updated_at: new Date().toISOString()
        };
      }

      onUpdateInspection(updatedInspection);
      
      toast({
        title: "Sucesso",
        description: "Marca d'água aplicada com sucesso!",
        variant: "default"
      });
      
      setIsWatermarkDialog(false);
      setSelectedMediaForWatermark(null);
      
    } catch (error) {
      console.error("Erro ao aplicar marca d'água:", error);
      
      let errorMessage = "Erro desconhecido ao aplicar marca d'água";
      
      if (error.message.includes("Timeout")) {
        errorMessage = "Timeout - a imagem pode ser muito grande. Tente novamente.";
      } else if (error.message.includes("CORS") || error.message.includes("carregar")) {
        errorMessage = "Erro ao carregar a imagem. Tente novamente.";
      } else if (error.message.includes("Firebase")) {
        errorMessage = "Erro ao salvar no Firebase. Verifique sua conexão.";
      } else {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsApplyingWatermark(false);
    }
  }, [selectedMediaForWatermark, inspection, onUpdateInspection, toast]);

  // Aplicar marca d'água em todas as imagens sem marca d'água
  const applyWatermarkToAll = useCallback(async () => {
    const imagesWithoutWatermark = [];
    
    inspection?.topics?.forEach((topic, topicIndex) => {
      // Mídia do tópico
      topic.media?.forEach((media, mediaIndex) => {
        if (media.type === 'image' && !hasWatermark(media)) {
          imagesWithoutWatermark.push({
            media,
            context: { 
              topicIndex, 
              itemIndex: null, 
              detailIndex: null, 
              mediaIndex, 
              isNC: false, 
              ncIndex: null 
            }
          });
        }
      });

      // Mídia dos itens
      topic.items?.forEach((item, itemIndex) => {
        item.media?.forEach((media, mediaIndex) => {
          if (media.type === 'image' && !hasWatermark(media)) {
            imagesWithoutWatermark.push({
              media,
              context: { 
                topicIndex, 
                itemIndex, 
                detailIndex: null, 
                mediaIndex, 
                isNC: false, 
                ncIndex: null 
              }
            });
          }
        });

        // Mídia dos detalhes
        item.details?.forEach((detail, detailIndex) => {
          detail.media?.forEach((media, mediaIndex) => {
            if (media.type === 'image' && !hasWatermark(media)) {
              imagesWithoutWatermark.push({
                media,
                context: { 
                  topicIndex, 
                  itemIndex, 
                  detailIndex, 
                  mediaIndex, 
                  isNC: false, 
                  ncIndex: null 
                }
              });
            }
          });

          // Mídia das não conformidades
          detail.non_conformities?.forEach((nc, ncIndex) => {
            nc.media?.forEach((media, mediaIndex) => {
              if (media.type === 'image' && !hasWatermark(media)) {
                imagesWithoutWatermark.push({
                  media,
                  context: { 
                    topicIndex, 
                    itemIndex, 
                    detailIndex, 
                    mediaIndex, 
                    isNC: true, 
                    ncIndex 
                  }
                });
              }
            });
          });
        });
      });
    });

    if (imagesWithoutWatermark.length === 0) {
      toast({
        title: "Informação",
        description: "Todas as imagens já possuem marca d'água!",
      });
      return;
    }

    setIsBulkWatermark(true);
    setBulkProgress({ current: 0, total: imagesWithoutWatermark.length });

    let updatedInspection = { ...inspection };
    let processedCount = 0;

    try {
      for (const { media, context } of imagesWithoutWatermark) {
        try {
          console.log(`Processando ${processedCount + 1}/${imagesWithoutWatermark.length}:`, media.url);
          
          // Aplicar marca d'água
          const imageSource = detectImageSource(null, false);
          const watermarkedDataURL = await addWatermarkToImage(
            media.url, 
            inspection.id, 
            imageSource
          );
          
          // Criar arquivo
          const timestamp = Date.now();
          const fileName = `image_watermarked_${timestamp}_${processedCount}.jpg`;
          const watermarkedFile = dataURLtoFile(watermarkedDataURL, fileName);
          
          // Definir caminho
          let storagePath;
          if (context.isNC && context.ncIndex !== null) {
            storagePath = `inspections/${inspection.id}/topic_${context.topicIndex}/item_${context.itemIndex}/detail_${context.detailIndex}/non_conformities/nc_${context.ncIndex}/${fileName}`;
          } else if (context.detailIndex !== null) {
            storagePath = `inspections/${inspection.id}/topic_${context.topicIndex}/item_${context.itemIndex}/detail_${context.detailIndex}/media/${fileName}`;
          } else if (context.itemIndex !== null) {
            storagePath = `inspections/${inspection.id}/topic_${context.topicIndex}/item_${context.itemIndex}/media/${fileName}`;
          } else {
            storagePath = `inspections/${inspection.id}/topic_${context.topicIndex}/media/${fileName}`;
          }

          // Upload
          const storageRef = ref(storage, storagePath);
          const uploadResult = await uploadBytes(storageRef, watermarkedFile);
          const downloadURL = await getDownloadURL(uploadResult.ref);
          
          // Atualizar dados
          if (context.isNC && context.ncIndex !== null) {
            updatedInspection.topics[context.topicIndex].items[context.itemIndex]
              .details[context.detailIndex].non_conformities[context.ncIndex]
              .media[context.mediaIndex] = {
                ...media,
                url: downloadURL,
                id: `watermarked_${media.id}`,
                updated_at: new Date().toISOString()
              };
          } else if (context.detailIndex !== null) {
            updatedInspection.topics[context.topicIndex].items[context.itemIndex]
              .details[context.detailIndex].media[context.mediaIndex] = {
                ...media,
                url: downloadURL,
                id: `watermarked_${media.id}`,
                updated_at: new Date().toISOString()
              };
          } else if (context.itemIndex !== null) {
            updatedInspection.topics[context.topicIndex].items[context.itemIndex]
              .media[context.mediaIndex] = {
                ...media,
                url: downloadURL,
                id: `watermarked_${media.id}`,
                updated_at: new Date().toISOString()
              };
          } else {
            updatedInspection.topics[context.topicIndex].media[context.mediaIndex] = {
              ...media,
              url: downloadURL,
              id: `watermarked_${media.id}`,
              updated_at: new Date().toISOString()
            };
          }

          processedCount++;
          setBulkProgress({ current: processedCount, total: imagesWithoutWatermark.length });
          
          // Pequena pausa para não sobrecarregar
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Erro ao processar imagem ${processedCount + 1}:`, error);
          // Continuar processando as outras imagens
          processedCount++;
          setBulkProgress({ current: processedCount, total: imagesWithoutWatermark.length });
        }
      }

      // Atualizar inspeção
      onUpdateInspection(updatedInspection);
      
      toast({
        title: "Processamento Concluído",
        description: `${processedCount} imagens processadas com sucesso!`,
      });
      
    } catch (error) {
      console.error("Erro no processamento em lote:", error);
      toast({
        title: "Erro no Processamento",
        description: `Erro após processar ${processedCount} imagens.`,
        variant: "destructive"
      });
    } finally {
      setIsBulkWatermark(false);
      setBulkProgress({ current: 0, total: 0 });
    }
  }, [inspection, onUpdateInspection, toast]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        {/* Header de Estatísticas */}
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Images className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Total: {mediaStats.total}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileImage className="h-5 w-5 text-green-500" />
                <span>Imagens: {mediaStats.totalImages}</span>
              </div>
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-purple-500" />
                <span>Vídeos: {mediaStats.totalVideos}</span>
              </div>
              {mediaStats.imagesWithoutWatermark > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span>Sem marca d'água: {mediaStats.imagesWithoutWatermark}</span>
                </div>
              )}
            </div>
            
            {mediaStats.imagesWithoutWatermark > 0 && (
              <Button
                variant="outline"
                onClick={applyWatermarkToAll}
                disabled={isBulkWatermark}
                className="flex items-center gap-2"
              >
                {isBulkWatermark ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Droplets className="h-4 w-4" />
                )}
                {isBulkWatermark ? "Processando..." : "Aplicar Marca d'Água em Todas"}
              </Button>
            )}
          </div>
          
          {/* Barra de progresso do processamento em lote */}
          {isBulkWatermark && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Processando imagens...</span>
                <span>{bulkProgress.current}/{bulkProgress.total}</span>
              </div>
              <Progress 
                value={(bulkProgress.current / bulkProgress.total) * 100} 
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Layout de Três Colunas */}
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-280px)]">
          {/* Coluna de Tópicos */}
          <div className="col-span-3 border rounded-lg">
            <div className="p-3 border-b flex justify-between items-center">
              <h3 className="font-medium">Tópicos ({inspection.topics?.length || 0})</h3>
            </div>
            <ScrollArea className="h-[calc(100vh-360px)]">
              <div className="p-2 space-y-1">
                {inspection.topics?.map((topic, topicIndex) => (
                  <UniversalDropZone
                    key={topicIndex}
                    topicIndex={topicIndex}
                    onDropMedia={onMoveMedia}
                    acceptTypes={[DRAG_TYPES.MEDIA]}
                    hasContent={topic.media?.length > 0}
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
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {topic.media?.length || 0}
                            </Badge>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); toggleSection(`topic-${topicIndex}`); }}>
                                {collapsedSections[`topic-${topicIndex}`] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                            </Button>
                        </div>
                      </div>
                      
                      {/* Grid de mídia do tópico */}
                      {!collapsedSections[`topic-${topicIndex}`] && topic.media?.length > 0 && (
                        <div className="grid grid-cols-3 gap-1" onClick={(e) => e.stopPropagation()}>
                          {topic.media.map((media, mediaIndex) => (
                            <DraggableMediaItem
                              key={mediaIndex}
                              media={media}
                              context={{
                                topicIndex,
                                itemIndex: null,
                                detailIndex: null,
                                mediaIndex,
                                isNC: false,
                                ncIndex: null
                              }}
                              onView={handleViewMedia}
                              onMove={handleMoveMedia}
                              onRemove={handleRemoveMedia}
                              onWatermark={handleWatermark}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </UniversalDropZone>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Coluna de Itens */}
          <div className="col-span-3 border rounded-lg">
            <div className="p-3 border-b">
              <h3 className="font-medium">
                Itens {currentTopic ? `(${currentTopic.items?.length || 0})` : ''}
              </h3>
            </div>
            <ScrollArea className="h-[calc(100vh-360px)]">
              {currentTopic?.items?.length > 0 ? (
                <div className="p-2 space-y-1">
                  {currentTopic.items.map((item, itemIndex) => (
                    <UniversalDropZone
                      key={itemIndex}
                      topicIndex={activeTopicIndex}
                      itemIndex={itemIndex}
                      onDropMedia={onMoveMedia}
                      acceptTypes={[DRAG_TYPES.MEDIA]}
                      hasContent={item.media?.length > 0}
                    >
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
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {item.media?.length || 0}
                            </Badge>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); toggleSection(`item-${activeTopicIndex}-${itemIndex}`); }}>
                                {collapsedSections[`item-${activeTopicIndex}-${itemIndex}`] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        
                        {/* Grid de mídia do item */}
                        {!collapsedSections[`item-${activeTopicIndex}-${itemIndex}`] && item.media?.length > 0 && (
                          <div className="grid grid-cols-3 gap-1" onClick={(e) => e.stopPropagation()}>
                            {item.media.map((media, mediaIndex) => (
                              <DraggableMediaItem
                                key={mediaIndex}
                                media={media}
                                context={{
                                  topicIndex: activeTopicIndex,
                                  itemIndex,
                                  detailIndex: null,
                                  mediaIndex,
                                  isNC: false,
                                  ncIndex: null
                                }}
                                onView={handleViewMedia}
                                onMove={handleMoveMedia}
                                onRemove={handleRemoveMedia}
                                onWatermark={handleWatermark}
                              />
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs opacity-70">
                          {item.details?.length > 0 && (
                            <span>{item.details.length} detalhe{item.details.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                    </UniversalDropZone>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  {currentTopic 
                    ? "Nenhum item encontrado" 
                    : "Selecione um tópico"
                  }
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Coluna de Detalhes */}
          <div className="col-span-6 border rounded-lg">
            <div className="p-3 border-b">
              <h3 className="font-medium">
                Detalhes {currentItem ? `(${currentItem.details?.length || 0})` : ''}
              </h3>
            </div>
            <ScrollArea className="h-[calc(100vh-360px)]">
              {currentItem?.details?.length > 0 ? (
                <div className="p-4 space-y-4">
                  {currentItem.details.map((detail, detailIndex) => (
                    <UniversalDropZone
                      key={detailIndex}
                      topicIndex={activeTopicIndex}
                      itemIndex={activeItemIndex}
                      detailIndex={detailIndex}
                      onDropMedia={onMoveMedia}
                      acceptTypes={[DRAG_TYPES.MEDIA]}
                      hasContent={detail.media?.length > 0 || detail.non_conformities?.some(nc => nc.media?.length > 0)}
                    >
                      <div className="border rounded-lg p-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">{detail.name}</h4>
                          <Button variant="ghost" size="sm" onClick={() => toggleSection(`${activeTopicIndex}-${activeItemIndex}-${detailIndex}`)}>
                            {collapsedSections[`${activeTopicIndex}-${activeItemIndex}-${detailIndex}`] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                          </Button>
                          <div className="flex items-center gap-2">
                            {detail.is_damaged && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Danos
                              </Badge>
                            )}
                            {hasWatermark({ url: detail.media?.[0]?.url }) && (
                              <Badge variant="outline" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Marca d'água
                              </Badge>
                            )}
                          </div>
                        </div>

                        {!collapsedSections[`${activeTopicIndex}-${activeItemIndex}-${detailIndex}`] && (
                          <>
                            {/* Mídia do detalhe */}
                            {detail.media?.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium mb-2">
                                  Mídia ({detail.media.length})
                                </h5>
                                <div className="grid grid-cols-4 gap-2">
                                  {detail.media.map((media, mediaIndex) => (
                                    <DraggableMediaItem
                                      key={mediaIndex}
                                      media={media}
                                      context={{
                                        topicIndex: activeTopicIndex,
                                        itemIndex: activeItemIndex,
                                        detailIndex,
                                        mediaIndex,
                                        isNC: false,
                                        ncIndex: null
                                      }}
                                      onView={handleViewMedia}
                                      onMove={handleMoveMedia}
                                      onRemove={handleRemoveMedia}
                                      onWatermark={handleWatermark}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Não conformidades */}
                            {detail.non_conformities?.map((nc, ncIndex) => (
                              nc.media?.length > 0 && (
                                <div key={ncIndex}>
                                  <h5 className="text-sm font-medium mb-2">
                                    Não Conformidade {ncIndex + 1} - Mídia ({nc.media.length})
                                  </h5>
                                  <div className="grid grid-cols-4 gap-2">
                                    {nc.media.map((media, mediaIndex) => (
                                      <DraggableMediaItem
                                        key={mediaIndex}
                                        media={media}
                                        context={{
                                          topicIndex: activeTopicIndex,
                                          itemIndex: activeItemIndex,
                                          detailIndex,
                                          mediaIndex,
                                          isNC: true,
                                          ncIndex
                                        }}
                                        onView={handleViewMedia}
                                        onMove={handleMoveMedia}
                                        onRemove={handleRemoveMedia}
                                        onWatermark={handleWatermark}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )
                            ))}
                          </>
                        )}
                      </div>
                    </UniversalDropZone>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  {currentItem 
                    ? "Nenhum detalhe encontrado" 
                    : currentTopic 
                      ? "Selecione um item para ver os detalhes" 
                      : "Selecione um tópico e um item para ver os detalhes"
                  }
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Dialog de Confirmação de Marca d'Água */}
        <Dialog open={isWatermarkDialog} onOpenChange={setIsWatermarkDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Aplicar Marca d'Água</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja aplicar a marca d'água nesta imagem? 
                Esta ação não pode ser desfeita.
              </p>
              {selectedMediaForWatermark && (
                <div className="border rounded-lg p-4">
                  <img
                    src={selectedMediaForWatermark.media.url}
                    alt="Preview"
                    className="w-full max-h-48 object-contain rounded"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsWatermarkDialog(false)}
                disabled={isApplyingWatermark}
              >
                Cancelar
              </Button>
              <Button 
                onClick={applyWatermark} 
                disabled={isApplyingWatermark}
                className="flex items-center gap-2"
              >
                {isApplyingWatermark ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Droplets className="h-4 w-4" />
                )}
                {isApplyingWatermark ? "Aplicando..." : "Aplicar Marca d'Água"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DndProvider>
  );
}