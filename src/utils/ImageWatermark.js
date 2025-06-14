// src/utils/watermarkImage.js

// Função para detectar origem da imagem baseada no arquivo
function detectImageSource(file, isFromCamera = false) {
  // Se foi explicitamente marcado como da câmera (através do input capture)
  if (isFromCamera) {
    return 'camera';
  }
  
  // Verificar se é de câmera através de metadados EXIF ou nome do arquivo
  if (file && file.name) {
    // Arquivos de câmera geralmente têm nomes como IMG_, DSC_, etc.
    const cameraPatterns = /^(IMG_|DSC_|DCIM_|Photo_|image_)/i;
    if (cameraPatterns.test(file.name)) {
      return 'camera';
    }
  }
  
  // Verificar se foi capturado através da câmera (arquivo muito recente ou nome específico)
  if (file && file.lastModified) {
    const now = Date.now();
    const timeDiff = now - file.lastModified;
    // Se o arquivo foi criado há menos de 2 minutos, provavelmente é da câmera
    if (timeDiff < 2 * 60 * 1000) {
      return 'camera';
    }
  }
  
  // Por padrão, assumir que é de arquivos (computador)
  return 'files';
}

export { detectImageSource };

export async function addWatermarkToImage(imageUrl, inspectionId, source = 'files') {
  return new Promise((resolve, reject) => {
    try {
      // Verificar se está em ambiente browser
      if (typeof document === 'undefined') {
        reject(new Error("Marca d'água só funciona no browser"));
        return;
      }

      // Verificar se a URL já é um dataURL
      if (imageUrl.startsWith('data:')) {
        // Se já for um dataURL, carregamos diretamente
        const img = new Image();
        
        // Timeout para evitar travamento
        const timeoutId = setTimeout(() => {
          reject(new Error("Timeout ao carregar imagem para marca d'água"));
        }, 10000);
        
        img.onload = () => {
          clearTimeout(timeoutId);
          try {
            // Prosseguir com a adição da marca d'água
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error("Não foi possível criar contexto de canvas"));
              return;
            }
            
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Desenhar a imagem original
            ctx.drawImage(img, 0, 0);
            
            // Adicionar a marca d'água
            addWatermarkToCanvas(ctx, canvas.width, canvas.height, inspectionId, source);
            
            // Retornar o dataURL
            try {
              const dataURL = canvas.toDataURL('image/jpeg', 0.95);
              if (!dataURL || dataURL === 'data:,') {
                throw new Error("Canvas produziu dataURL inválido");
              }
              resolve(dataURL);
            } catch (toDataURLError) {
              reject(new Error("Erro ao converter canvas para dataURL: " + toDataURLError.message));
            }
          } catch (canvasError) {
            reject(new Error("Erro ao processar canvas: " + canvasError.message));
          }
        };
        
        img.onerror = () => {
          clearTimeout(timeoutId);
          console.error("Erro ao carregar imagem dataURL para marca d'água");
          reject(new Error("Falha ao processar imagem para marca d'água"));
        };
        
        img.src = imageUrl;
      } else {
        // Para URLs regulares, primeiro desenhamos em um canvas
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Para lidar com CORS
        
        // Timeout para evitar travamento
        const timeoutId = setTimeout(() => {
          reject(new Error("Timeout ao carregar imagem externa para marca d'água"));
        }, 15000);
        
        img.onload = () => {
          clearTimeout(timeoutId);
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error("Não foi possível criar contexto de canvas"));
              return;
            }
            
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Desenhar a imagem original
            ctx.drawImage(img, 0, 0);
            
            // Adicionar a marca d'água
            addWatermarkToCanvas(ctx, canvas.width, canvas.height, inspectionId, source);
            
            // Retornar o dataURL
            try {
              const dataURL = canvas.toDataURL('image/jpeg', 0.95);
              if (!dataURL || dataURL === 'data:,') {
                throw new Error("Canvas produziu dataURL inválido");
              }
              resolve(dataURL);
            } catch (toDataURLError) {
              reject(new Error("Erro ao converter canvas para dataURL: " + toDataURLError.message));
            }
          } catch (canvasError) {
            reject(new Error("Erro ao processar canvas: " + canvasError.message));
          }
        };
        
        img.onerror = () => {
          clearTimeout(timeoutId);
          console.error("Erro ao carregar imagem externa para marca d'água");
          // Em caso de erro, rejeitar com uma mensagem mais específica
          reject(new Error("Falha ao carregar imagem para aplicar marca d'água"));
        };
        
        // Adicionar cache buster
        const cacheBuster = `?t=${Date.now()}`;
        img.src = imageUrl + cacheBuster;
      }
    } catch (error) {
      reject(new Error("Erro geral na função de marca d'água: " + error.message));
    }
  });
}

// Função auxiliar para adicionar a marca d'água ao canvas
function addWatermarkToCanvas(ctx, width, height, inspectionId, source = 'files') {
  // Obter data e hora atual
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR'); // formato: dd/mm/aaaa
  const timeStr = now.toLocaleTimeString('pt-BR', { hour12: false }); // formato: hh:mm:ss
  
  // Determinar emoji e texto baseado na origem
  const sourceConfig = {
    camera: {
      emoji: '📷',
      text: `[📷][${dateStr.replace(/\//g, '/')} ${timeStr}]`
    },
    files: {
      emoji: '📁',
      text: `[📁][${dateStr.replace(/\//g, '/')} ${timeStr}]`
    }
  };
  
  const config = sourceConfig[source] || sourceConfig.files;
  const watermarkText = config.text;
  
  // Configurar fonte (tamanho responsivo)
  const fontSize = Math.max(14, width * 0.018);
  ctx.font = `bold ${fontSize}px Arial`;
  
  // Medir o texto para posicionamento
  const textMetrics = ctx.measureText(watermarkText);
  const textWidth = textMetrics.width;
  const textHeight = fontSize;
  
  // Posicionar no canto inferior direito
  const padding = 15;
  const x = width - textWidth - padding;
  const y = height - padding;
  
  // Configurar fundo escuro com cantos arredondados
  const bgPadding = 8;
  const bgX = x - bgPadding;
  const bgY = y - textHeight - bgPadding;
  const bgWidth = textWidth + (bgPadding * 2);
  const bgHeight = textHeight + (bgPadding * 2);
  const borderRadius = 6;
  
  // Desenhar fundo escuro com cantos arredondados
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.beginPath();
  ctx.roundRect(bgX, bgY, bgWidth, bgHeight, borderRadius);
  ctx.fill();
  
  // Desenhar o texto em branco
  ctx.fillStyle = 'white';
  ctx.fillText(watermarkText, x, y);
  
  // Desenhar emoji customizado (apenas contornos brancos)
  drawCustomEmoji(ctx, bgX + bgPadding/2, bgY + bgHeight/2, fontSize * 0.8, source);
}

// Função para desenhar emoji customizado com apenas contornos brancos
function drawCustomEmoji(ctx, x, y, size, source) {
  ctx.strokeStyle = 'white';
  ctx.fillStyle = 'transparent';
  ctx.lineWidth = 2;
  
  if (source === 'camera') {
    // Desenhar câmera com apenas contornos brancos
    const scale = size / 20;
    
    // Corpo da câmera
    ctx.beginPath();
    ctx.roundRect(x - 8 * scale, y - 5 * scale, 16 * scale, 10 * scale, 2 * scale);
    ctx.stroke();
    
    // Lente
    ctx.beginPath();
    ctx.arc(x + 2 * scale, y, 4 * scale, 0, Math.PI * 2);
    ctx.stroke();
    
    // Lente interna
    ctx.beginPath();
    ctx.arc(x + 2 * scale, y, 2 * scale, 0, Math.PI * 2);
    ctx.stroke();
    
    // Visor
    ctx.beginPath();
    ctx.rect(x - 6 * scale, y - 3 * scale, 3 * scale, 2 * scale);
    ctx.stroke();
    
    // Flash
    ctx.beginPath();
    ctx.rect(x - 2 * scale, y - 4 * scale, 2 * scale, 1 * scale);
    ctx.stroke();
    
  } else {
    // Desenhar pasta com apenas contornos brancos
    const scale = size / 20;
    
    // Corpo da pasta
    ctx.beginPath();
    ctx.roundRect(x - 8 * scale, y - 4 * scale, 16 * scale, 8 * scale, 1 * scale);
    ctx.stroke();
    
    // Aba da pasta
    ctx.beginPath();
    ctx.roundRect(x - 6 * scale, y - 6 * scale, 6 * scale, 2 * scale, 1 * scale);
    ctx.stroke();
    
    // Linhas internas da pasta
    ctx.beginPath();
    ctx.moveTo(x - 4 * scale, y - 1 * scale);
    ctx.lineTo(x + 4 * scale, y - 1 * scale);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x - 4 * scale, y + 1 * scale);
    ctx.lineTo(x + 4 * scale, y + 1 * scale);
    ctx.stroke();
  }
}