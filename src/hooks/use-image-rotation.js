import { useState } from 'react';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { addWatermarkToImage } from '@/utils/ImageWatermark';

export function useImageRotation() {
  const [rotation, setRotation] = useState(0);
  const [saving, setSaving] = useState(false);
  
  const rotateImage = (direction) => {
    const newRotation = direction === 'left' 
      ? (rotation - 90) % 360 
      : (rotation + 90) % 360;
    setRotation(newRotation);
  };
  
  const saveRotatedImage = async (media, inspectionId, context, inspection, updateInspection) => {
    if (media.type !== 'image') return null;
    
    setSaving(true);
    try {
      const { topicIndex, itemIndex, detailIndex, mediaIndex, isNC, ncIndex } = context;
      
      // Criar um canvas para rotacionar a imagem
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      // Resolver problemas de CORS adicionando um proxy
      // Se estiver em desenvolvimento, podemos usar apenas a URL direta
      
      // Cria uma promessa para carregar a imagem
      const imageLoaded = new Promise(async (resolve, reject) => {
        // Configurar manipuladores de eventos antes de definir src
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(new Error('Erro ao carregar imagem: ' + e.message));
        
        // Importante: setar crossOrigin para anônimo para evitar erros de CORS
        img.crossOrigin = 'anonymous';
        
        // Adicionar timestamp para evitar cache
        const cacheBuster = `?t=${Date.now()}`;
        
        // Teste condicional para diferentes tipos de URLs
        if (media.url.startsWith('data:')) {
          // URLs de dados não precisam de crossOrigin
          img.src = media.url;
        } else if (media.url.startsWith('blob:')) {
          // URLs de blob não precisam de crossOrigin
          img.src = media.url;
        } else if (media.url.startsWith('http')) {
          // URLs HTTP podem precisar de proxy para CORS
          // Verificar se é uma URL do Firebase Storage - nesse caso, não precisamos de proxy
          if (media.url.includes('firebasestorage.googleapis.com')) {
            try {
              // Tenta baixar novamente a URL para garantir que temos uma URL fresca
              // Extrai o caminho do storage da URL
              const urlParts = media.url.split('?')[0].split('/o/');
              if (urlParts.length > 1) {
                const storagePath = decodeURIComponent(urlParts[1]);
                const storageRef = ref(storage, storagePath);
                const freshUrl = await getDownloadURL(storageRef);
                img.src = freshUrl + cacheBuster;
              } else {
                img.src = media.url + cacheBuster;
              }
            } catch (error) {
              console.error("Erro ao obter URL fresca:", error);
              img.src = media.url + cacheBuster;
            }
          } else {
            // Para URLs não-Firebase, podemos tentar um proxy CORS se necessário
            img.src = media.url + cacheBuster;
          }
        } else {
          // Outros tipos de URLs
          img.src = media.url;
        }
      });
      
      // Esperar a imagem carregar
      const loadedImg = await imageLoaded;
      
      // Definir dimensões do canvas com base na rotação
      if (rotation === 90 || rotation === 270) {
        canvas.width = loadedImg.height;
        canvas.height = loadedImg.width;
      } else {
        canvas.width = loadedImg.width;
        canvas.height = loadedImg.height;
      }
      
      // Traslação e rotação para desenhar corretamente
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rotation * Math.PI / 180);
      ctx.drawImage(loadedImg, -loadedImg.width / 2, -loadedImg.height / 2);
      ctx.restore();
      
      // Obter dados da imagem rotacionada
      const dataURL = canvas.toDataURL('image/jpeg', 0.9);
      
      // Adicionar marca d'água
      const watermarkedImageURL = await addWatermarkToImage(dataURL, inspectionId);
      
      // Caminho para salvar a imagem rotacionada
      let storagePath;
      if (isNC) {
        storagePath = `inspections/${inspectionId}/topic_${topicIndex}/item_${itemIndex}/detail_${detailIndex}/non_conformities/nc_${ncIndex}/rotated_${Date.now()}.jpg`;
      } else {
        storagePath = `inspections/${inspectionId}/topic_${topicIndex}/item_${itemIndex}/detail_${detailIndex}/media/rotated_${Date.now()}.jpg`;
      }
      
      // Upload da imagem
      const storageRef = ref(storage, storagePath);
      await uploadString(storageRef, watermarkedImageURL, 'data_url');
      const newUrl = await getDownloadURL(storageRef);
      
      // Criar novo objeto de mídia
      const rotatedMedia = {
        ...media,
        url: newUrl,
        rotationApplied: rotation,
        updated_at: new Date().toISOString()
      };
      
      // Atualizar inspeção com a nova mídia
      const updatedInspection = structuredClone(inspection);
      
      if (isNC) {
        updatedInspection.topics[topicIndex].items[itemIndex].details[detailIndex].non_conformities[ncIndex].media[mediaIndex] = rotatedMedia;
      } else {
        updatedInspection.topics[topicIndex].items[itemIndex].details[detailIndex].media[mediaIndex] = rotatedMedia;
      }
      
      // Atualizar estado
      updateInspection(updatedInspection);
      
      return rotatedMedia;
    } catch (error) {
      console.error("Error saving rotated image:", error);
      throw error;
    } finally {
      setSaving(false);
    }
  };
  
  return { rotation, setRotation, rotateImage, saveRotatedImage, saving };
}