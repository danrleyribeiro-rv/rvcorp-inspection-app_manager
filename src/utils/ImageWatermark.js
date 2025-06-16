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
  return new Promise(async (resolve, reject) => {
    try {
      // Verificar se está em ambiente browser
      if (typeof document === 'undefined') {
        reject(new Error("Marca d'água só funciona no browser"));
        return;
      }

      let imageBlob;

      // Verificar se a URL já é um dataURL
      if (imageUrl.startsWith('data:')) {
        // Converter dataURL para blob
        try {
          const response = await fetch(imageUrl);
          imageBlob = await response.blob();
        } catch (fetchError) {
          reject(new Error("Erro ao converter dataURL para blob: " + fetchError.message));
          return;
        }
      } else {
        // Se for URL do Firebase Storage, tentar API proxy diretamente primeiro
        if (imageUrl.includes('firebasestorage.googleapis.com')) {
          try {
            console.log("URL do Firebase detectada, tentando API proxy direto...");
            
            const proxyResponse = await fetch('/api/watermark', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                imageUrl: imageUrl,
                inspectionId: inspectionId,
                source: source,
                processWatermark: true
              })
            });
            
            if (proxyResponse.ok) {
              const proxyData = await proxyResponse.json();
              
              if (proxyData.success && proxyData.dataURL) {
                if (proxyData.watermarkApplied) {
                  console.log("Firebase + API proxy: marca d'água aplicada no servidor!");
                  resolve(proxyData.dataURL);
                  return;
                } else {
                  console.log("Firebase + API proxy: usando imagem do servidor para processamento no cliente...");
                  const proxyDataResponse = await fetch(proxyData.dataURL);
                  imageBlob = await proxyDataResponse.blob();
                  
                  if (imageBlob && imageBlob.size > 0) {
                    // Pular para o processamento do blob
                    console.log("Firebase proxy funcionou, processando blob...");
                  } else {
                    throw new Error("Blob vazio do proxy");
                  }
                }
              } else {
                throw new Error("Proxy retornou dados inválidos");
              }
            } else {
              throw new Error(`Proxy falhou: ${proxyResponse.status}`);
            }
          } catch (firebaseProxyError) {
            console.log("Proxy direto para Firebase falhou, tentando métodos tradicionais:", firebaseProxyError.message);
            // Continuar com métodos tradicionais
          }
        }
        
        // Se chegou até aqui e não tem imageBlob, tentar métodos tradicionais
        if (!imageBlob) {
          // Para URLs externas, fazer fetch primeiro para evitar CORS
          try {
            let response;
          
          // Primeira tentativa: fetch direto
          try {
            response = await fetch(imageUrl, {
              mode: 'cors',
              credentials: 'omit'
            });
          } catch (corsError) {
            console.log("Erro CORS na primeira tentativa, tentando sem modo cors:", corsError);
            
            // Segunda tentativa: fetch sem modo cors especificado
            try {
              response = await fetch(imageUrl, {
                credentials: 'omit'
              });
            } catch (secondError) {
              console.log("Segunda tentativa falhou, tentando como same-origin:", secondError);
              
              // Terceira tentativa: same-origin
              response = await fetch(imageUrl, {
                mode: 'same-origin'
              });
            }
          }
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          imageBlob = await response.blob();
          
          // Verificar se conseguiu fazer o fetch mas o blob está vazio
          if (!imageBlob || imageBlob.size === 0) {
            throw new Error("Imagem está vazia ou corrompida");
          }
          
        } catch (fetchError) {
          console.error("Erro ao fazer fetch da imagem:", fetchError);
          
          // Fallback: tentar carregar a imagem usando Image() e converter para canvas
          try {
            console.log("Tentando fallback com Image()...");
            
            const fallbackDataURL = await loadImageAsFallback(imageUrl);
            const fallbackResponse = await fetch(fallbackDataURL);
            imageBlob = await fallbackResponse.blob();
            
            if (!imageBlob || imageBlob.size === 0) {
              throw new Error("Fallback também falhou - blob vazio");
            }
            
            console.log("Fallback foi bem sucedido!");
            
          } catch (fallbackError) {
            console.error("Fallback também falhou:", fallbackError);
            
            // Último recurso: usar API proxy com processamento no servidor
            try {
              console.log("Tentando via API proxy com processamento no servidor...");
              
              const proxyResponse = await fetch('/api/watermark', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  imageUrl: imageUrl,
                  inspectionId: inspectionId,
                  source: source,
                  processWatermark: true // Processar marca d'água no servidor
                })
              });
              
              if (!proxyResponse.ok) {
                throw new Error(`Proxy API failed: ${proxyResponse.status}`);
              }
              
              const proxyData = await proxyResponse.json();
              
              if (!proxyData.success || !proxyData.dataURL) {
                throw new Error("Proxy API didn't return valid data");
              }
              
              if (proxyData.watermarkApplied) {
                console.log("Marca d'água aplicada no servidor com sucesso!");
                // Se a marca d'água foi aplicada no servidor, retornamos o dataURL diretamente
                resolve(proxyData.dataURL);
                return;
              } else {
                console.log("Servidor retornou imagem sem marca d'água, aplicando no cliente...");
                // Se o servidor não conseguiu aplicar a marca d'água, fazemos no cliente
                const proxyDataResponse = await fetch(proxyData.dataURL);
                imageBlob = await proxyDataResponse.blob();
              }
              
              console.log("API proxy foi bem sucedido!");
              
            } catch (proxyError) {
              console.error("API proxy também falhou:", proxyError);
              reject(new Error("Falha ao carregar imagem para aplicar marca d'água. Todos os métodos falharam."));
              return;
            }
          }
        }
        } // Fechar bloco if (!imageBlob)
      }

      // Verificar se o blob é válido
      if (!imageBlob || imageBlob.size === 0) {
        reject(new Error("Blob da imagem está vazio ou inválido"));
        return;
      }

      // Converter blob para dataURL
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const dataURL = event.target.result;
        
        // Carregar imagem a partir do dataURL
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
              const finalDataURL = canvas.toDataURL('image/jpeg', 0.95);
              if (!finalDataURL || finalDataURL === 'data:,') {
                throw new Error("Canvas produziu dataURL inválido");
              }
              resolve(finalDataURL);
            } catch (toDataURLError) {
              reject(new Error("Erro ao converter canvas para dataURL: " + toDataURLError.message));
            }
          } catch (canvasError) {
            reject(new Error("Erro ao processar canvas: " + canvasError.message));
          }
        };
        
        img.onerror = () => {
          clearTimeout(timeoutId);
          console.error("Erro ao carregar imagem do blob para marca d'água");
          reject(new Error("Falha ao processar imagem para marca d'água"));
        };
        
        img.src = dataURL;
      };

      reader.onerror = () => {
        reject(new Error("Erro ao ler blob da imagem"));
      };

      // Iniciar a leitura do blob
      reader.readAsDataURL(imageBlob);
      
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

// Função de fallback para carregar imagens com problemas de CORS
function loadImageAsFallback(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Timeout para evitar travamento
    const timeoutId = setTimeout(() => {
      reject(new Error("Timeout no fallback de carregamento de imagem"));
    }, 15000);
    
    img.onload = () => {
      clearTimeout(timeoutId);
      try {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Desenhar a imagem no canvas
        ctx.drawImage(img, 0, 0);
        
        // Converter para dataURL
        const dataURL = canvas.toDataURL('image/jpeg', 0.95);
        if (!dataURL || dataURL === 'data:,') {
          throw new Error("Canvas de fallback produziu dataURL inválido");
        }
        
        resolve(dataURL);
      } catch (canvasError) {
        reject(new Error("Erro no canvas de fallback: " + canvasError.message));
      }
    };
    
    img.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error("Fallback: falha ao carregar imagem"));
    };
    
    // Tentar carregar sem crossOrigin para contornar CORS
    img.src = imageUrl;
  });
}