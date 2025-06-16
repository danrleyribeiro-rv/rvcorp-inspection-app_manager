// src/components/inspection/MediaManagementTab.js
"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { 
  Images, 
  Video, 
  Move, 
  Trash2, 
  Eye, 
  Droplets,
  ChevronRight,
  Plus,
  AlertTriangle,
  CheckCircle,
  FolderOpen,
  FileImage
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addWatermarkToImage, detectImageSource } from "@/utils/ImageWatermark";
import { UniversalDropZone, DRAG_TYPES } from "@/components/inspection/EnhancedDragDropProvider";

// Componente para mídia arrastável
const DraggableMediaItem = ({ media, context, onView, onMove, onRemove, onWatermark }) => {
  const [{ isDragging }, drag] = useDrag({
    type: DRAG_TYPES.MEDIA,
    item: { 
      ...context,
      type: DRAG_TYPES.MEDIA
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const hasWatermark = media.url && (
    media.url.includes('watermark') || 
    media.url.includes('watermarked') ||
    media.id?.includes('watermark')
  );
  const canWatermark = media.type === 'image' && !hasWatermark;

  return (
    <div
      ref={drag}
      className={`group relative border rounded-lg overflow-hidden bg-white hover:shadow-sm transition-all duration-200 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {/* Media Preview */}
      <div className="aspect-square relative cursor-pointer" onClick={() => onView(media, context)}>
        {media.type === 'image' ? (
          <img
            src={media.url}
            alt="Media"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <Video className="h-6 w-6 text-gray-400" />
          </div>
        )}
        
        {/* Watermark indicator */}
        {media.type === 'image' && (
          <div className="absolute top-1 right-1">
            {hasWatermark ? (
              <CheckCircle className="h-4 w-4 text-green-500 bg-white rounded-full" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500 bg-white rounded-full" />
            )}
          </div>
        )}

        {/* Action buttons overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onView(media, context);
            }}
            className="h-6 w-6 p-0"
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onMove(media, context);
            }}
            className="h-6 w-6 p-0"
          >
            <Move className="h-3 w-3" />
          </Button>
          {canWatermark && (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onWatermark(media, context);
              }}
              className="h-6 w-6 p-0"
            >
              <Droplets className="h-3 w-3" />
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(media, context);
            }}
            className="h-6 w-6 p-0"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Media info */}
      <div className="p-1 border-t bg-gray-50">
        <div className="text-xs text-center capitalize font-medium">
          {media.type}
        </div>
      </div>
    </div>
  );
};

export default function MediaManagementTab({ 
  inspection, 
  onUploadMedia, 
  onRemoveMedia, 
  onMoveMedia, 
  onViewMedia, 
  onMoveDialog,
  onUpdateInspection 
}) {
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const [activeItemIndex, setActiveItemIndex] = useState(null);
  const [isWatermarkDialog, setIsWatermarkDialog] = useState(false);
  const [selectedMediaForWatermark, setSelectedMediaForWatermark] = useState(null);
  const [isApplyingWatermark, setIsApplyingWatermark] = useState(false);
  const { toast } = useToast();

  // Estatísticas de mídia
  const mediaStats = useMemo(() => {
    let totalImages = 0;
    let totalVideos = 0;
    let imagesWithoutWatermark = 0;

    inspection?.topics?.forEach((topic) => {
      // Topic media
      topic.media?.forEach((media) => {
        if (media.type === 'image') {
          totalImages++;
          const hasWatermark = media.url && (
            media.url.includes('watermark') || 
            media.url.includes('watermarked') ||
            media.id?.includes('watermark')
          );
          if (!hasWatermark) {
            imagesWithoutWatermark++;
          }
        } else if (media.type === 'video') {
          totalVideos++;
        }
      });

      // Item media
      topic.items?.forEach((item) => {
        item.media?.forEach((media) => {
          if (media.type === 'image') {
            totalImages++;
            const hasWatermark = media.url && (
              media.url.includes('watermark') || 
              media.url.includes('watermarked') ||
              media.id?.includes('watermark')
            );
            if (!hasWatermark) {
              imagesWithoutWatermark++;
            }
          } else if (media.type === 'video') {
            totalVideos++;
          }
        });

        // Detail media
        item.details?.forEach((detail) => {
          detail.media?.forEach((media) => {
            if (media.type === 'image') {
              totalImages++;
              const hasWatermark = media.url && (
                media.url.includes('watermark') || 
                media.url.includes('watermarked') ||
                media.id?.includes('watermark')
              );
              if (!hasWatermark) {
                imagesWithoutWatermark++;
              }
            } else if (media.type === 'video') {
              totalVideos++;
            }
          });

          // Non-conformity media
          detail.non_conformities?.forEach((nc) => {
            nc.media?.forEach((media) => {
              if (media.type === 'image') {
                totalImages++;
                const hasWatermark = media.url && (
                  media.url.includes('watermark') || 
                  media.url.includes('watermarked') ||
                  media.id?.includes('watermark')
                );
                if (!hasWatermark) {
                  imagesWithoutWatermark++;
                }
              } else if (media.type === 'video') {
                totalVideos++;
              }
            });
          });
        });
      });
    });

    return {
      totalImages,
      totalVideos,
      total: totalImages + totalVideos,
      imagesWithoutWatermark
    };
  }, [inspection]);

  // Handle media view
  const handleViewMedia = useCallback((media, context) => {
    onViewMedia(
      media, 
      context.topicIndex, 
      context.itemIndex, 
      context.detailIndex, 
      context.mediaIndex,
      context.isNC || false,
      context.ncIndex
    );
  }, [onViewMedia]);

  // Handle media move
  const handleMoveMedia = useCallback((media, context) => {
    onMoveDialog(
      media,
      context.topicIndex,
      context.itemIndex,
      context.detailIndex,
      context.mediaIndex,
      context.isNC || false,
      context.ncIndex
    );
  }, [onMoveDialog]);

  // Handle media remove
  const handleRemoveMedia = useCallback((media, context) => {
    onRemoveMedia(
      context.topicIndex,
      context.itemIndex,
      context.detailIndex,
      context.mediaIndex,
      context.isNC || false,
      context.ncIndex
    );
  }, [onRemoveMedia]);

  // Handle watermark application
  const handleWatermark = useCallback((media, context) => {
    setSelectedMediaForWatermark({ media, context });
    setIsWatermarkDialog(true);
  }, []);

  // Apply watermark to image
  const applyWatermark = useCallback(async () => {
    if (!selectedMediaForWatermark) return;

    setIsApplyingWatermark(true);
    
    try {
      const { media, context } = selectedMediaForWatermark;
      
      console.log("Aplicando marca d'água para:", media.url);
      
      // Create new file name and storage path
      const timestamp = Date.now();
      const fileName = `image_watermarked_${timestamp}.jpg`;
      
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

      // Use API to process watermark and upload directly
      const imageSource = detectImageSource(null, false);
      let downloadURL;
      
      try {
        console.log("Processando marca d'água via API com upload direto...");
        
        const apiResponse = await fetch('/api/watermark', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            imageUrl: media.url,
            inspectionId: inspection.id,
            source: imageSource,
            processWatermark: true,
            uploadToFirebase: true,
            storagePath: storagePath
          })
        });
        
        if (!apiResponse.ok) {
          throw new Error(`API failed: ${apiResponse.status}`);
        }
        
        const apiData = await apiResponse.json();
        
        if (!apiData.success) {
          throw new Error("API retornou erro");
        }
        
        if (apiData.uploaded && apiData.downloadURL) {
          downloadURL = apiData.downloadURL;
          console.log("Upload via API bem sucedido!");
        } else if (apiData.watermarkApplied && apiData.dataURL) {
          // Fallback: API aplicou marca d'água mas não fez upload
          console.log("API aplicou marca d'água, fazendo upload manual...");
          
          const response = await fetch(apiData.dataURL);
          const blob = await response.blob();
          
          const storageRef = ref(storage, storagePath);
          const snapshot = await uploadBytes(storageRef, blob);
          downloadURL = await getDownloadURL(snapshot.ref);
        } else {
          throw new Error("API não conseguiu processar a imagem");
        }
        
      } catch (apiError) {
        console.error("Erro na API, tentando método tradicional:", apiError);
        
        // Fallback para método tradicional
        try {
          const watermarkedImageURL = await addWatermarkToImage(media.url, inspection.id, imageSource);
          const response = await fetch(watermarkedImageURL);
          const blob = await response.blob();
          
          const storageRef = ref(storage, storagePath);
          const snapshot = await uploadBytes(storageRef, blob);
          downloadURL = await getDownloadURL(snapshot.ref);
        } catch (fallbackError) {
          console.error("Método tradicional também falhou:", fallbackError);
          throw new Error(`Todos os métodos falharam: ${fallbackError.message}`);
        }
      }

      // Update inspection data
      const updatedInspection = structuredClone(inspection);
      
      try {
        if (context.isNC && context.ncIndex !== null) {
          updatedInspection.topics[context.topicIndex].items[context.itemIndex].details[context.detailIndex].non_conformities[context.ncIndex].media[context.mediaIndex] = {
            ...media,
            url: downloadURL,
            updated_at: new Date().toISOString()
          };
        } else if (context.detailIndex !== null) {
          updatedInspection.topics[context.topicIndex].items[context.itemIndex].details[context.detailIndex].media[context.mediaIndex] = {
            ...media,
            url: downloadURL,
            updated_at: new Date().toISOString()
          };
        } else if (context.itemIndex !== null) {
          updatedInspection.topics[context.topicIndex].items[context.itemIndex].media[context.mediaIndex] = {
            ...media,
            url: downloadURL,
            updated_at: new Date().toISOString()
          };
        } else {
          updatedInspection.topics[context.topicIndex].media[context.mediaIndex] = {
            ...media,
            url: downloadURL,
            updated_at: new Date().toISOString()
          };
        }

        onUpdateInspection(updatedInspection);
        
        toast({
          title: "Marca d'água aplicada com sucesso"
        });
        
        setIsWatermarkDialog(false);
        setSelectedMediaForWatermark(null);
      } catch (updateError) {
        console.error("Erro ao atualizar dados da inspeção:", updateError);
        throw new Error(`Falha ao atualizar dados: ${updateError.message}`);
      }
      
    } catch (error) {
      console.error("Error applying watermark:", error);
      
      // Provide more specific error messages
      let errorMessage = "Erro desconhecido ao aplicar marca d'água";
      
      if (error.message.includes("CORS")) {
        errorMessage = "Erro de permissão ao acessar a imagem. Tente novamente.";
      } else if (error.message.includes("Network")) {
        errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
      } else if (error.message.includes("HTTP")) {
        errorMessage = "Erro ao carregar a imagem. A imagem pode estar corrompida.";
      } else if (error.message.includes("Canvas")) {
        errorMessage = "Erro no processamento da imagem. Tente com uma imagem menor.";
      } else if (error.message.includes("Firebase") || error.message.includes("upload")) {
        errorMessage = "Erro ao salvar a imagem. Tente novamente.";
      } else {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erro ao aplicar marca d'água",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsApplyingWatermark(false);
    }
  }, [selectedMediaForWatermark, inspection, onUpdateInspection, toast]);

  // Apply watermark to all images without watermark
  const applyWatermarkToAll = useCallback(async () => {
    const imagesWithoutWatermark = [];
    
    inspection?.topics?.forEach((topic, topicIndex) => {
      // Topic media
      topic.media?.forEach((media, mediaIndex) => {
        const hasWatermark = media.url && (
          media.url.includes('watermark') || 
          media.url.includes('watermarked') ||
          media.id?.includes('watermark')
        );
        if (media.type === 'image' && !hasWatermark) {
          imagesWithoutWatermark.push({
            media,
            context: { topicIndex, itemIndex: null, detailIndex: null, mediaIndex, isNC: false, ncIndex: null }
          });
        }
      });

      // Item media
      topic.items?.forEach((item, itemIndex) => {
        item.media?.forEach((media, mediaIndex) => {
          const hasWatermark = media.url && (
            media.url.includes('watermark') || 
            media.url.includes('watermarked') ||
            media.id?.includes('watermark')
          );
          if (media.type === 'image' && !hasWatermark) {
            imagesWithoutWatermark.push({
              media,
              context: { topicIndex, itemIndex, detailIndex: null, mediaIndex, isNC: false, ncIndex: null }
            });
          }
        });

        // Detail media
        item.details?.forEach((detail, detailIndex) => {
          detail.media?.forEach((media, mediaIndex) => {
            const hasWatermark = media.url && (
              media.url.includes('watermark') || 
              media.url.includes('watermarked') ||
              media.id?.includes('watermark')
            );
            if (media.type === 'image' && !hasWatermark) {
              imagesWithoutWatermark.push({
                media,
                context: { topicIndex, itemIndex, detailIndex, mediaIndex, isNC: false, ncIndex: null }
              });
            }
          });

          // Non-conformity media
          detail.non_conformities?.forEach((nc, ncIndex) => {
            nc.media?.forEach((media, mediaIndex) => {
              const hasWatermark = media.url && (
                media.url.includes('watermark') || 
                media.url.includes('watermarked') ||
                media.id?.includes('watermark')
              );
              if (media.type === 'image' && !hasWatermark) {
                imagesWithoutWatermark.push({
                  media,
                  context: { topicIndex, itemIndex, detailIndex, mediaIndex, isNC: true, ncIndex }
                });
              }
            });
          });
        });
      });
    });

    for (let i = 0; i < imagesWithoutWatermark.length; i++) {
      const { media, context } = imagesWithoutWatermark[i];
      setSelectedMediaForWatermark({ media, context });
      await applyWatermark();
    }
  }, [inspection, applyWatermark]);

  if (!inspection || !inspection.topics || inspection.topics.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <Images className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma estrutura encontrada para gerenciar mídias</p>
        </div>
      </div>
    );
  }

  const currentTopic = inspection.topics[activeTopicIndex];
  const currentItem = activeItemIndex !== null ? currentTopic?.items?.[activeItemIndex] : null;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        {/* Statistics Header */}
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
                className="flex items-center gap-2"
              >
                <Droplets className="h-4 w-4" />
                Aplicar Marca d'Água em Todas
              </Button>
            )}
          </div>
        </div>

        {/* Three Column Layout */}
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-280px)]">
          {/* Topics Column */}
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
                        <Badge variant="secondary" className="text-xs">
                          {topic.media?.length || 0}
                        </Badge>
                      </div>
                      
                      {/* Topic Media Grid */}
                      {topic.media?.length > 0 && (
                        <div className="grid grid-cols-4 gap-1" onClick={(e) => e.stopPropagation()}>
                          {topic.media.slice(0, 4).map((media, mediaIndex) => (
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
                      
                      <div className="flex items-center justify-between text-xs opacity-70">
                        {topic.items?.length > 0 && (
                          <span>{topic.items.length} item{topic.items.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
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
            </div>
            <ScrollArea className="h-[calc(100vh-360px)]">
              {currentTopic ? (
                <div className="p-2 space-y-1">
                  {currentTopic.items?.map((item, itemIndex) => (
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
                          <Badge variant="secondary" className="text-xs">
                            {item.media?.length || 0}
                          </Badge>
                        </div>
                        
                        {/* Item Media Grid */}
                        {item.media?.length > 0 && (
                          <div className="grid grid-cols-3 gap-1" onClick={(e) => e.stopPropagation()}>
                            {item.media.slice(0, 3).map((media, mediaIndex) => (
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
            </div>
            <ScrollArea className="h-[calc(100vh-360px)]">
              {currentItem ? (
                <div className="p-4 space-y-4">
                  {currentItem.details?.map((detail, detailIndex) => (
                    <UniversalDropZone
                      key={detailIndex}
                      topicIndex={activeTopicIndex}
                      itemIndex={activeItemIndex}
                      detailIndex={detailIndex}
                      onDropMedia={onMoveMedia}
                      acceptTypes={[DRAG_TYPES.MEDIA]}
                      hasContent={detail.media?.length > 0 || detail.non_conformities?.some(nc => nc.media?.length > 0)}
                    >
                      <div className="border rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{detail.name || `Detalhe ${detailIndex + 1}`}</h4>
                          <Badge variant="outline">
                            {(detail.media?.length || 0) + (detail.non_conformities?.reduce((acc, nc) => acc + (nc.media?.length || 0), 0) || 0)} mídias
                          </Badge>
                        </div>
                        
                        {/* Detail Media */}
                        {detail.media?.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium mb-2">Mídias do Detalhe</h5>
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
                        
                        {/* Non-Conformity Media */}
                        {detail.non_conformities?.map((nc, ncIndex) => (
                          nc.media?.length > 0 && (
                            <div key={ncIndex}>
                              <h5 className="text-sm font-medium mb-2">
                                Não Conformidade {ncIndex + 1} ({nc.media.length} mídia{nc.media.length !== 1 ? 's' : ''})
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
                      </div>
                    </UniversalDropZone>
                  ))}
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

        {/* Watermark Confirmation Dialog */}
        <Dialog open={isWatermarkDialog} onOpenChange={setIsWatermarkDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aplicar Marca d'Água</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>Tem certeza que deseja aplicar a marca d'água nesta imagem?</p>
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
              <Button variant="outline" onClick={() => setIsWatermarkDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={applyWatermark} disabled={isApplyingWatermark}>
                {isApplyingWatermark ? "Aplicando..." : "Aplicar Marca d'Água"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DndProvider>
  );
}