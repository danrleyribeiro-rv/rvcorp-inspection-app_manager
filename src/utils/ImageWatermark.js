// src/utils/ImageWatermark.js

/**
 * Detecta a origem da imagem baseada no arquivo
 */
export function detectImageSource(file, isFromCamera = false) {
  if (isFromCamera) {
    return 'camera';
  }
  
  if (file && file.name) {
    const cameraPatterns = /^(IMG_|DSC_|DCIM_|Photo_|image_|screenshot)/i;
    if (cameraPatterns.test(file.name)) {
      return 'camera';
    }
  }
  
  if (file && file.lastModified) {
    const now = Date.now();
    const timeDiff = now - file.lastModified;
    if (timeDiff < 2 * 60 * 1000) {
      return 'camera';
    }
  }
  
  return 'files';
}

/**
 * Adiciona marca d'água ao canvas
 */
function addWatermarkToCanvas(ctx, width, height, inspectionId, source = 'files') {
  // Obter data e hora atual
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour12: false });
  
  // Configurar texto baseado na origem (formato solicitado)
  const sourceConfig = {
    camera: {
      emoji: '📷',
      text: `[📷][${dateStr} ${timeStr}]`
    },
    files: {
      emoji: '📁', 
      text: `[📁][${dateStr} ${timeStr}]`
    }
  };
  
  const config = sourceConfig[source] || sourceConfig.files;
  const watermarkText = config.text;
  
  // Configurações da marca d'água
  const fontSize = Math.max(14, Math.min(width * 0.025, height * 0.035));
  const padding = Math.max(8, fontSize * 0.6);
  
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  // Calcular dimensões do texto
  const textMetrics = ctx.measureText(watermarkText);
  const textWidth = textMetrics.width;
  const textHeight = fontSize;
  
  // Dimensões da caixa de fundo
  const boxWidth = textWidth + (padding * 2);
  const boxHeight = textHeight + (padding * 2);
  
  // Posicionar no canto inferior direito
  const x = width - boxWidth - Math.max(10, width * 0.02);
  const y = height - boxHeight - Math.max(10, height * 0.02);
  
  // Desenhar fundo preto com 50% de opacidade
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(x, y, boxWidth, boxHeight);
  
  // Desenhar texto branco
  ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
  ctx.fillText(watermarkText, x + padding, y + padding);
}

/**
 * Função principal para adicionar marca d'água
 */
export async function addWatermarkToImage(imageUrl, inspectionId, source = 'files') {
  return new Promise(async (resolve, reject) => {
    try {
      if (typeof document === 'undefined') {
        reject(new Error('Marca d\'água só funciona no browser'));
        return;
      }

      let dataURL;

      // Se for dataURL, usar diretamente
      if (imageUrl.startsWith('data:')) {
        dataURL = imageUrl;
      } else {
        // Para URLs do Firebase, usar nossa API
        try {
          // Baixando imagem via API
          
          const apiResponse = await fetch('/api/watermark', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageUrl,
              inspectionId,
              source
            }),
          });

          if (!apiResponse.ok) {
            throw new Error(`API falhou: ${apiResponse.status}`);
          }

          const apiData = await apiResponse.json();

          if (!apiData.success) {
            throw new Error(apiData.error || 'API retornou erro');
          }

          dataURL = apiData.dataURL;

        } catch (apiError) {
          reject(new Error(`Falha ao baixar imagem: ${apiError.message}`));
          return;
        }
      }

      // Criar imagem a partir do dataURL
      const img = new Image();
      
      // Importante: definir crossOrigin antes de definir src
      img.crossOrigin = 'anonymous';
      
      // Timeout para evitar travamento
      const timeoutId = setTimeout(() => {
        reject(new Error('Timeout ao carregar imagem'));
      }, 30000);
      
      img.onload = () => {
        clearTimeout(timeoutId);
        
        try {
          // Verificar se a imagem carregou corretamente
          if (img.width === 0 || img.height === 0) {
            reject(new Error('Imagem carregou com dimensões inválidas'));
            return;
          }
          
          // Criar canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Falha ao criar contexto do canvas'));
            return;
          }
          
          // Definir tamanho do canvas igual à imagem
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Limpar canvas (fundo branco)
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Desenhar imagem original
          ctx.drawImage(img, 0, 0, img.width, img.height);
          
          // Verificar se a imagem foi desenhada corretamente
          const imageData = ctx.getImageData(0, 0, Math.min(10, canvas.width), Math.min(10, canvas.height));
          const hasData = imageData.data.some(value => value > 0);
          
          if (!hasData) {
            reject(new Error('Falha ao desenhar imagem no canvas - imagem pode estar corrompida'));
            return;
          }
          
          // Adicionar marca d'água
          addWatermarkToCanvas(ctx, canvas.width, canvas.height, inspectionId, source);
          
          // Converter para dataURL
          try {
            const result = canvas.toDataURL('image/jpeg', 0.95);
            
            if (!result || result === 'data:,' || result.length < 100) {
              reject(new Error('Falha ao gerar imagem final - resultado inválido'));
              return;
            }
            
            resolve(result);
            
          } catch (toDataURLError) {
            reject(new Error(`Erro ao converter canvas para imagem: ${toDataURLError.message}`));
          }
        } catch (canvasError) {
          reject(new Error(`Erro no processamento do canvas: ${canvasError.message}`));
        }
      };
      
      img.onerror = (error) => {
        clearTimeout(timeoutId);
        reject(new Error('Falha ao carregar imagem para processamento'));
      };
      
      // Definir src por último
      img.src = dataURL;
      
    } catch (error) {
      reject(new Error(`Erro geral: ${error.message}`));
    }
  });
}

/**
 * Converte dataURL para File
 */
export function dataURLtoFile(dataURL, filename) {
  try {
    const arr = dataURL.split(',');
    if (arr.length !== 2) {
      throw new Error('DataURL inválido');
    }
    
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
  } catch (error) {
    throw new Error(`Erro ao converter dataURL para arquivo: ${error.message}`);
  }
}

/**
 * Verifica se uma imagem já possui marca d'água
 */
export function hasWatermark(media) {
  if (!media || !media.cloudUrl) return false;
  
  return (
    media.cloudUrl.includes('watermark') || 
    media.cloudUrl.includes('watermarked') ||
    media.id?.includes('watermark') ||
    media.id?.includes('watermarked')
  );
}