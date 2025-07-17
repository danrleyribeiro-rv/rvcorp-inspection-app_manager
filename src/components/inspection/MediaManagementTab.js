import React, { useState, useCallback, useMemo, useRef } from "react";
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
  Loader2,
  RotateCw,
  Crop,
  Calculator
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
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [selectedImageForCrop, setSelectedImageForCrop] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropProgress, setCropProgress] = useState({ current: 0, total: 0 });
  const canvasRef = useRef(null);

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

    // Store reference to avoid issues with state changes during async operations
    const currentSelection = selectedMediaForWatermark;

    try {
      if (!currentSelection) {
        throw new Error('No media selected for watermark');
      }
      
      const { media, context } = currentSelection;
      
      if (!media || !media.cloudUrl) {
        throw new Error('Invalid media object or missing cloudUrl');
      }
      
      // Validate context indices and attempt to fix them using current active indices
      if (context.topicIndex === undefined || context.mediaIndex === undefined) {
        // If we're dealing with topic-level media and topicIndex is undefined
        if (context.topicIndex === undefined && context.itemIndex === null && context.detailIndex === null) {
          context.topicIndex = activeTopicIndex;
          
          // Find the mediaIndex by looking for the media in the current topic
          const currentTopic = inspection.topics[activeTopicIndex];
          if (currentTopic && currentTopic.media) {
            const foundIndex = currentTopic.media.findIndex(m => m.cloudUrl === media.cloudUrl);
            if (foundIndex !== -1) {
              context.mediaIndex = foundIndex;
            }
          }
        }
        
        // Final validation
        if (context.topicIndex === undefined || context.mediaIndex === undefined) {
          throw new Error(`Invalid context indices: topicIndex=${context.topicIndex}, mediaIndex=${context.mediaIndex}`);
        }
      }
      
      console.log("Aplicando marca d'água para:", media.cloudUrl);
      
      // Detectar origem da imagem
      const imageSource = detectImageSource(null, false);
      
      // Aplicar marca d'água
      const watermarkedDataURL = await addWatermarkToImage(
        media.cloudUrl, 
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
            cloudUrl: downloadURL,
            id: `watermarked_${media.id}`,
            updated_at: new Date().toISOString()
          };
      } else if (context.detailIndex !== null) {
        updatedInspection.topics[context.topicIndex].items[context.itemIndex]
          .details[context.detailIndex].media[context.mediaIndex] = {
            ...media,
            cloudUrl: downloadURL,
            id: `watermarked_${media.id}`,
            updated_at: new Date().toISOString()
          };
      } else if (context.itemIndex !== null) {
        updatedInspection.topics[context.topicIndex].items[context.itemIndex]
          .media[context.mediaIndex] = {
            ...media,
            cloudUrl: downloadURL,
            id: `watermarked_${media.id}`,
            updated_at: new Date().toISOString()
          };
      } else {
        updatedInspection.topics[context.topicIndex].media[context.mediaIndex] = {
          ...media,
          cloudUrl: downloadURL,
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
      // Safely log error with context information
      let safeLogData = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        mediaId: 'N/A',
        mediaUrl: 'N/A',
        context: 'N/A'
      };
      
      try {
        if (currentSelection) {
          safeLogData.mediaId = currentSelection.media?.id || 'N/A';
          safeLogData.mediaUrl = currentSelection.media?.cloudUrl || 'N/A';
          safeLogData.context = currentSelection.context || 'N/A';
        }
      } catch (logError) {
        safeLogData.logError = logError.message;
      }
      
      console.error("Erro ao aplicar marca d'água:", safeLogData);
      
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
  }, [selectedMediaForWatermark, inspection, onUpdateInspection, toast, activeTopicIndex]);

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
          console.log(`Processando ${processedCount + 1}/${imagesWithoutWatermark.length}:`, media.cloudUrl);
          
          // Aplicar marca d'água
          const imageSource = detectImageSource(null, false);
          const watermarkedDataURL = await addWatermarkToImage(
            media.cloudUrl, 
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
                cloudUrl: downloadURL,
                id: `watermarked_${media.id}`,
                updated_at: new Date().toISOString()
              };
          } else if (context.detailIndex !== null) {
            updatedInspection.topics[context.topicIndex].items[context.itemIndex]
              .details[context.detailIndex].media[context.mediaIndex] = {
                ...media,
                cloudUrl: downloadURL,
                id: `watermarked_${media.id}`,
                updated_at: new Date().toISOString()
              };
          } else if (context.itemIndex !== null) {
            updatedInspection.topics[context.topicIndex].items[context.itemIndex]
              .media[context.mediaIndex] = {
                ...media,
                cloudUrl: downloadURL,
                id: `watermarked_${media.id}`,
                updated_at: new Date().toISOString()
              };
          } else {
            updatedInspection.topics[context.topicIndex].media[context.mediaIndex] = {
              ...media,
              cloudUrl: downloadURL,
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

  // Image processing functions
  const loadImageFromUrl = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // Check if this is a Firebase Storage URL that might need proxy
      const isFirebaseStorage = url.includes('firebasestorage.googleapis.com');
      
      // Try with CORS first, fallback without if blocked, then try proxy
      const tryLoadImage = (useCors = true, useProxy = false) => {
        const newImg = new Image();
        let imageUrl = url;
        
        if (useProxy && isFirebaseStorage) {
          imageUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
        }
        
        if (useCors && !useProxy) {
          newImg.crossOrigin = "anonymous";
        }
        
        newImg.onload = () => resolve(newImg);
        newImg.onerror = (error) => {
          if (useCors && !useProxy) {
            tryLoadImage(false, false);
          } else if (!useCors && !useProxy && isFirebaseStorage) {
            tryLoadImage(true, true);
          } else {
            console.error('Error loading image from URL:', {
              url,
              error,
              message: 'Failed to load image with all methods',
              useCors,
              useProxy,
              isFirebaseStorage
            });
            reject(new Error(`Failed to load image from URL: ${url}`));
          }
        };
        newImg.src = imageUrl;
      };
      
      tryLoadImage(true, false);
    });
  };

  const cropImageTo4x3 = async (imageUrl) => {
    try {
      const img = await loadImageFromUrl(imageUrl);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const { width: originalWidth, height: originalHeight } = img;
      const aspectRatio = 4 / 3;
      
      let newWidth, newHeight, offsetX = 0, offsetY = 0;
      
      // Determine if image is landscape or portrait
      if (originalWidth > originalHeight) {
        // Landscape image - crop horizontally
        newHeight = originalHeight;
        newWidth = newHeight * aspectRatio;
        offsetX = (originalWidth - newWidth) / 2;
      } else {
        // Portrait image - crop vertically  
        newWidth = originalWidth;
        newHeight = newWidth / aspectRatio;
        offsetY = (originalHeight - newHeight) / 2;
      }
      
      // Set canvas dimensions to 4:3 ratio
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Draw cropped image
      ctx.drawImage(
        img,
        offsetX, offsetY, newWidth, newHeight,
        0, 0, newWidth, newHeight
      );
      
      try {
        return canvas.toDataURL('image/jpeg', 0.9);
      } catch (canvasError) {
        // If canvas is tainted due to CORS, try using fetch to proxy the image
        return await cropImageWithFetch(imageUrl);
      }
    } catch (error) {
      console.error('Error cropping image:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        imageUrl
      });
      throw error;
    }
  };

  const cropImageWithFetch = async (imageUrl) => {
    try {
      // Use proxy API to fetch the image and avoid CORS issues
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
      console.log('Fetching via proxy:', proxyUrl);
      
      const response = await fetch(proxyUrl);
      
      console.log('Proxy response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image via proxy: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log('Blob created:', blob);
      
      const img = await createImageBitmap(blob);
      console.log('ImageBitmap created:', img);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const { width: originalWidth, height: originalHeight } = img;
      const aspectRatio = 4 / 3;
      
      let newWidth, newHeight, offsetX = 0, offsetY = 0;
      
      // Determine if image is landscape or portrait
      if (originalWidth > originalHeight) {
        // Landscape image - crop horizontally
        newHeight = originalHeight;
        newWidth = newHeight * aspectRatio;
        offsetX = (originalWidth - newWidth) / 2;
      } else {
        // Portrait image - crop vertically  
        newWidth = originalWidth;
        newHeight = newWidth / aspectRatio;
        offsetY = (originalHeight - newHeight) / 2;
      }
      
      // Set canvas dimensions to 4:3 ratio
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Draw cropped image
      ctx.drawImage(
        img,
        offsetX, offsetY, newWidth, newHeight,
        0, 0, newWidth, newHeight
      );
      
      const result = canvas.toDataURL('image/jpeg', 0.9);
      console.log('Canvas cropped successfully via fetch');
      return result;
    } catch (error) {
      console.error('Error cropping image with fetch:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        imageUrl
      });
      throw new Error(`Failed to crop image using fetch method: ${error.message}`);
    }
  };

  const rotateImage = async (imageUrl, degrees = 90) => {
    try {
      const img = await loadImageFromUrl(imageUrl);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas dimensions based on rotation
      if (degrees === 90 || degrees === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }
      
      // Move to center and rotate
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      
      // Draw image
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      
      return canvas.toDataURL('image/jpeg', 0.9);
    } catch (error) {
      console.error('Error rotating image:', error);
      throw error;
    }
  };

  const uploadProcessedImage = async (dataUrl, originalMedia, context, suffix = 'processed') => {
    try {
      console.log('uploadProcessedImage called with:', { originalMedia, context, suffix });
      
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Create file
      const timestamp = Date.now();
      const fileName = `image_${suffix}_${timestamp}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      
      // Define storage path
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

      // Upload to Firebase
      const storageRef = ref(storage, storagePath);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading processed image:', error);
      throw error;
    }
  };

  const handleCropImage = useCallback((media, context) => {
    console.log('handleCropImage called with:', { media, context });
    
    if (media.type !== 'image') {
      toast({
        title: "Aviso",
        description: "Apenas imagens podem ser cortadas",
        variant: "default"
      });
      return;
    }

    setSelectedImageForCrop({ media, context });
    setIsCropDialogOpen(true);
  }, [toast]);

  const applyCrop = useCallback(async () => {
    console.log('applyCrop called, selectedImageForCrop:', selectedImageForCrop);
    console.log('Current activeTopicIndex:', activeTopicIndex);
    console.log('Current activeItemIndex:', activeItemIndex);
    
    if (!selectedImageForCrop) return;

    setIsCropping(true);

    // Store reference to avoid issues with state changes during async operations
    const currentSelection = selectedImageForCrop;
    
    console.log('currentSelection:', currentSelection);

    try {
      if (!currentSelection) {
        throw new Error('No image selected for cropping');
      }
      
      const { media, context } = currentSelection;
      
      console.log('Extracted media and context:', { media, context });
      
      if (!media || !media.cloudUrl) {
        throw new Error('Invalid media object or missing cloudUrl');
      }
      
      // Crop image to 4:3 ratio
      const croppedDataURL = await cropImageTo4x3(media.cloudUrl);
      
      console.log('Cropped data URL generated, length:', croppedDataURL.length);
      console.log('About to upload processed image with:', { media, context });
      
      // Upload processed image
      const downloadURL = await uploadProcessedImage(croppedDataURL, media, context, 'cropped');
      
      console.log('Upload completed, downloadURL:', downloadURL);
      
      // Update inspection data
      const updatedInspection = { ...inspection };
      
      console.log('About to update inspection data with context:', context);
      console.log('Current selection at this point:', currentSelection);
      
      // Validate context indices and attempt to fix them using current active indices
      if (context.topicIndex === undefined || context.mediaIndex === undefined) {
        // If we're dealing with topic-level media and topicIndex is undefined
        if (context.topicIndex === undefined && context.itemIndex === null && context.detailIndex === null) {
          context.topicIndex = activeTopicIndex;
          
          // Find the mediaIndex by looking for the media in the current topic
          const currentTopic = inspection.topics[activeTopicIndex];
          if (currentTopic && currentTopic.media) {
            const foundIndex = currentTopic.media.findIndex(m => m.cloudUrl === media.cloudUrl);
            if (foundIndex !== -1) {
              context.mediaIndex = foundIndex;
            }
          }
        }
        
        // Final validation
        if (context.topicIndex === undefined || context.mediaIndex === undefined) {
          throw new Error(`Invalid context indices: topicIndex=${context.topicIndex}, mediaIndex=${context.mediaIndex}`);
        }
      }
      
      if (context.isNC && context.ncIndex !== null) {
        updatedInspection.topics[context.topicIndex].items[context.itemIndex]
          .details[context.detailIndex].non_conformities[context.ncIndex]
          .media[context.mediaIndex] = {
            ...media,
            cloudUrl: downloadURL,
            id: `cropped_${media.id}`,
            updated_at: new Date().toISOString()
          };
      } else if (context.detailIndex !== null) {
        updatedInspection.topics[context.topicIndex].items[context.itemIndex]
          .details[context.detailIndex].media[context.mediaIndex] = {
            ...media,
            cloudUrl: downloadURL,
            id: `cropped_${media.id}`,
            updated_at: new Date().toISOString()
          };
      } else if (context.itemIndex !== null) {
        updatedInspection.topics[context.topicIndex].items[context.itemIndex]
          .media[context.mediaIndex] = {
            ...media,
            cloudUrl: downloadURL,
            id: `cropped_${media.id}`,
            updated_at: new Date().toISOString()
          };
      } else {
        updatedInspection.topics[context.topicIndex].media[context.mediaIndex] = {
          ...media,
          cloudUrl: downloadURL,
          id: `cropped_${media.id}`,
          updated_at: new Date().toISOString()
        };
      }

      onUpdateInspection(updatedInspection);
      
      toast({
        title: "Sucesso",
        description: "Imagem cortada para proporção 4:3 com sucesso!",
        variant: "default"
      });
      
      setIsCropDialogOpen(false);
      setSelectedImageForCrop(null);
      
    } catch (error) {
      // Safely extract info for logging
      let safeLogData = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        mediaId: 'N/A',
        mediaUrl: 'N/A',
        context: 'N/A',
        currentSelectionExists: false,
        currentSelectionType: 'undefined',
        currentSelectionValue: null
      };
      
      try {
        if (currentSelection) {
          safeLogData.currentSelectionExists = true;
          safeLogData.currentSelectionType = typeof currentSelection;
          safeLogData.currentSelectionValue = currentSelection;
          safeLogData.mediaId = currentSelection.media?.id || 'N/A';
          safeLogData.mediaUrl = currentSelection.media?.cloudUrl || 'N/A';
          safeLogData.context = currentSelection.context || 'N/A';
          // Add detailed context breakdown
          if (currentSelection.context) {
            safeLogData.contextDetails = {
              topicIndex: currentSelection.context.topicIndex,
              itemIndex: currentSelection.context.itemIndex,
              detailIndex: currentSelection.context.detailIndex,
              mediaIndex: currentSelection.context.mediaIndex,
              isNC: currentSelection.context.isNC,
              ncIndex: currentSelection.context.ncIndex
            };
          }
        }
      } catch (logError) {
        safeLogData.logError = logError.message;
      }
      
      console.error("Erro ao cortar imagem:", safeLogData);
      
      toast({
        title: "Erro",
        description: `Erro ao processar imagem: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive"
      });
    } finally {
      setIsCropping(false);
    }
  }, [selectedImageForCrop, inspection, onUpdateInspection, toast]);

  const handleRotateImage = useCallback(async (media, context, degrees = 90) => {
    if (media.type !== 'image') {
      toast({
        title: "Aviso",
        description: "Apenas imagens podem ser rotacionadas",
        variant: "default"
      });
      return;
    }

    try {
      // Validate context indices and attempt to fix them using current active indices
      if (context.topicIndex === undefined || context.mediaIndex === undefined) {
        // If we're dealing with topic-level media and topicIndex is undefined
        if (context.topicIndex === undefined && context.itemIndex === null && context.detailIndex === null) {
          context.topicIndex = activeTopicIndex;
          
          // Find the mediaIndex by looking for the media in the current topic
          const currentTopic = inspection.topics[activeTopicIndex];
          if (currentTopic && currentTopic.media) {
            const foundIndex = currentTopic.media.findIndex(m => m.cloudUrl === media.cloudUrl);
            if (foundIndex !== -1) {
              context.mediaIndex = foundIndex;
            }
          }
        }
        
        // Final validation
        if (context.topicIndex === undefined || context.mediaIndex === undefined) {
          throw new Error(`Invalid context indices: topicIndex=${context.topicIndex}, mediaIndex=${context.mediaIndex}`);
        }
      }
      
      // Rotate image
      const rotatedDataURL = await rotateImage(media.cloudUrl, degrees);
      
      // Upload processed image
      const downloadURL = await uploadProcessedImage(rotatedDataURL, media, context, 'rotated');
      
      // Update inspection data
      const updatedInspection = { ...inspection };
      
      if (context.isNC && context.ncIndex !== null) {
        updatedInspection.topics[context.topicIndex].items[context.itemIndex]
          .details[context.detailIndex].non_conformities[context.ncIndex]
          .media[context.mediaIndex] = {
            ...media,
            cloudUrl: downloadURL,
            id: `rotated_${media.id}`,
            updated_at: new Date().toISOString()
          };
      } else if (context.detailIndex !== null) {
        updatedInspection.topics[context.topicIndex].items[context.itemIndex]
          .details[context.detailIndex].media[context.mediaIndex] = {
            ...media,
            cloudUrl: downloadURL,
            id: `rotated_${media.id}`,
            updated_at: new Date().toISOString()
          };
      } else if (context.itemIndex !== null) {
        updatedInspection.topics[context.topicIndex].items[context.itemIndex]
          .media[context.mediaIndex] = {
            ...media,
            cloudUrl: downloadURL,
            id: `rotated_${media.id}`,
            updated_at: new Date().toISOString()
          };
      } else {
        updatedInspection.topics[context.topicIndex].media[context.mediaIndex] = {
          ...media,
          cloudUrl: downloadURL,
          id: `rotated_${media.id}`,
          updated_at: new Date().toISOString()
        };
      }

      onUpdateInspection(updatedInspection);
      
      toast({
        title: "Sucesso",
        description: `Imagem rotacionada ${degrees}° com sucesso!`,
        variant: "default"
      });
      
    } catch (error) {
      console.error("Erro ao rotacionar imagem:", error);
      
      toast({
        title: "Erro",
        description: "Erro ao rotacionar imagem. Tente novamente.",
        variant: "destructive"
      });
    }
  }, [inspection, onUpdateInspection, toast, activeTopicIndex]);

  // Crop all images to 4:3 ratio
  const cropAllImagesTo4x3 = useCallback(async () => {
    const imagesToCrop = [];
    
    inspection?.topics?.forEach((topic, topicIndex) => {
      // Topic media
      topic.media?.forEach((media, mediaIndex) => {
        if (media.type === 'image') {
          imagesToCrop.push({
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

      // Item media
      topic.items?.forEach((item, itemIndex) => {
        item.media?.forEach((media, mediaIndex) => {
          if (media.type === 'image') {
            imagesToCrop.push({
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

        // Detail media
        item.details?.forEach((detail, detailIndex) => {
          detail.media?.forEach((media, mediaIndex) => {
            if (media.type === 'image') {
              imagesToCrop.push({
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

          // NC media
          detail.non_conformities?.forEach((nc, ncIndex) => {
            nc.media?.forEach((media, mediaIndex) => {
              if (media.type === 'image') {
                imagesToCrop.push({
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

    if (imagesToCrop.length === 0) {
      toast({
        title: "Informação",
        description: "Nenhuma imagem encontrada para processar!",
      });
      return;
    }

    setIsCropping(true);
    setCropProgress({ current: 0, total: imagesToCrop.length });

    let updatedInspection = { ...inspection };
    let processedCount = 0;

    try {
      for (const { media, context } of imagesToCrop) {
        try {
          console.log(`Processando imagem ${processedCount + 1}/${imagesToCrop.length}`);
          
          // Crop image
          const croppedDataURL = await cropImageTo4x3(media.cloudUrl);
          
          // Upload processed image
          const downloadURL = await uploadProcessedImage(croppedDataURL, media, context, 'cropped');
          
          // Update data
          if (context.isNC && context.ncIndex !== null) {
            updatedInspection.topics[context.topicIndex].items[context.itemIndex]
              .details[context.detailIndex].non_conformities[context.ncIndex]
              .media[context.mediaIndex] = {
                ...media,
                cloudUrl: downloadURL,
                id: `cropped_${media.id}`,
                updated_at: new Date().toISOString()
              };
          } else if (context.detailIndex !== null) {
            updatedInspection.topics[context.topicIndex].items[context.itemIndex]
              .details[context.detailIndex].media[context.mediaIndex] = {
                ...media,
                cloudUrl: downloadURL,
                id: `cropped_${media.id}`,
                updated_at: new Date().toISOString()
              };
          } else if (context.itemIndex !== null) {
            updatedInspection.topics[context.topicIndex].items[context.itemIndex]
              .media[context.mediaIndex] = {
                ...media,
                cloudUrl: downloadURL,
                id: `cropped_${media.id}`,
                updated_at: new Date().toISOString()
              };
          } else {
            updatedInspection.topics[context.topicIndex].media[context.mediaIndex] = {
              ...media,
              cloudUrl: downloadURL,
              id: `cropped_${media.id}`,
              updated_at: new Date().toISOString()
            };
          }

          processedCount++;
          setCropProgress({ current: processedCount, total: imagesToCrop.length });
          
          // Small delay to avoid overwhelming
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Erro ao processar imagem ${processedCount + 1}:`, error);
          processedCount++;
          setCropProgress({ current: processedCount, total: imagesToCrop.length });
        }
      }

      // Update inspection
      onUpdateInspection(updatedInspection);
      
      toast({
        title: "Processamento Concluído",
        description: `${processedCount} imagens processadas para proporção 4:3!`,
      });
      
    } catch (error) {
      console.error("Erro no processamento em lote:", error);
      toast({
        title: "Erro no Processamento",
        description: `Erro após processar ${processedCount} imagens.`,
        variant: "destructive"
      });
    } finally {
      setIsCropping(false);
      setCropProgress({ current: 0, total: 0 });
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
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={cropAllImagesTo4x3}
                disabled={isCropping || isBulkWatermark}
                className="flex items-center gap-2"
              >
                {isCropping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crop className="h-4 w-4" />
                )}
                {isCropping ? "Cortando..." : "Cortar Todas 4:3"}
              </Button>
              {mediaStats.imagesWithoutWatermark > 0 && (
                <Button
                  variant="outline"
                  onClick={applyWatermarkToAll}
                  disabled={isBulkWatermark || isCropping}
                  className="flex items-center gap-2"
                >
                  {isBulkWatermark ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Droplets className="h-4 w-4" />
                  )}
                  {isBulkWatermark ? "Processando..." : "Aplicar Marca d'Água"}
                </Button>
              )}
              <Button
                variant="outline"
                className="flex items-center gap-2"
              >
                <Calculator className="h-4 w-4" />
                Contar: {mediaStats.totalImages} img
              </Button>
            </div>
          </div>
          
          {/* Barra de progresso do processamento em lote */}
          {(isBulkWatermark || isCropping) && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{isCropping ? "Cortando imagens..." : "Processando imagens..."}</span>
                <span>
                  {isCropping ? `${cropProgress.current}/${cropProgress.total}` : `${bulkProgress.current}/${bulkProgress.total}`}
                </span>
              </div>
              <Progress 
                value={isCropping ? 
                  (cropProgress.current / cropProgress.total) * 100 : 
                  (bulkProgress.current / bulkProgress.total) * 100
                } 
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
                              onCrop={handleCropImage}
                              onRotate={handleRotateImage}
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
                              onCrop={handleCropImage}
                              onRotate={handleRotateImage}
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
                            {hasWatermark({ cloudUrl: detail.media?.[0]?.cloudUrl }) && (
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
                              onCrop={handleCropImage}
                              onRotate={handleRotateImage}
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
                              onCrop={handleCropImage}
                              onRotate={handleRotateImage}
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
                    src={selectedMediaForWatermark.media.cloudUrl}
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
        
        {/* Crop Confirmation Dialog */}
        <Dialog open={isCropDialogOpen} onOpenChange={setIsCropDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cortar Imagem para 4:3</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Esta imagem será cortada automaticamente para a proporção 4:3. 
                Imagens em paisagem serão cortadas horizontalmente e imagens em retrato serão cortadas verticalmente.
              </p>
              {selectedImageForCrop && (
                <div className="border rounded-lg p-4">
                  <img
                    src={selectedImageForCrop.media.cloudUrl}
                    alt="Preview"
                    className="w-full max-h-48 object-contain rounded"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsCropDialogOpen(false)}
                disabled={isCropping}
              >
                Cancelar
              </Button>
              <Button 
                onClick={applyCrop} 
                disabled={isCropping}
                className="flex items-center gap-2"
              >
                {isCropping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crop className="h-4 w-4" />
                )}
                {isCropping ? "Cortando..." : "Cortar para 4:3"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DndProvider>
  );
}