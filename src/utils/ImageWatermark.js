// src/utils/watermarkImage.js
export async function addWatermarkToImage(imageUrl, inspectionId) {
  return new Promise((resolve, reject) => {
    try {
      // Verificar se a URL já é um dataURL
      if (imageUrl.startsWith('data:')) {
        // Se já for um dataURL, carregamos diretamente
        const img = new Image();
        img.onload = () => {
          // Prosseguir com a adição da marca d'água
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Desenhar a imagem original
          ctx.drawImage(img, 0, 0);
          
          // Adicionar a marca d'água
          addWatermarkToCanvas(ctx, canvas.width, canvas.height, inspectionId);
          
          // Retornar o dataURL
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        
        img.onerror = (error) => {
          reject(error);
        };
        
        img.src = imageUrl;
      } else {
        // Para URLs regulares, primeiro desenhamos em um canvas
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Para lidar com CORS
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Desenhar a imagem original
          ctx.drawImage(img, 0, 0);
          
          // Adicionar a marca d'água
          addWatermarkToCanvas(ctx, canvas.width, canvas.height, inspectionId);
          
          // Retornar o dataURL
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        
        img.onerror = (error) => {
          console.error("Erro ao carregar imagem para marca d'água:", error);
          // Em caso de erro, podemos tentar carregar a imagem de outra forma ou simplesmente retornar a URL original
          reject(error);
        };
        
        // Adicionar cache buster
        const cacheBuster = `?t=${Date.now()}`;
        img.src = imageUrl + cacheBuster;
      }
    } catch (error) {
      reject(error);
    }
  });
}

// Função auxiliar para adicionar a marca d'água ao canvas
function addWatermarkToCanvas(ctx, width, height, inspectionId) {
  // Configurar o estilo da marca d'água
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.lineWidth = 1;
  
  // Obter data e hora atual
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR'); // formato: dd/mm/aaaa
  const timeStr = now.toLocaleTimeString('pt-BR'); // formato: hh:mm:ss
  
  // Texto da marca d'água
  const watermarkText = `ID: ${inspectionId.substring(0, 6)} - ${dateStr} ${timeStr}`;
  
  // Configurar fonte
  ctx.font = `${Math.max(16, width * 0.02)}px Arial`;
  
  // Posicionar a marca d'água no canto inferior direito
  const textWidth = ctx.measureText(watermarkText).width;
  const x = width - textWidth - 20;
  const y = height - 20;
  
  // Adicionar um retângulo semi-transparente atrás do texto
  ctx.fillRect(x - 5, y - 20, textWidth + 10, 25);
  
  // Adicionar o texto da marca d'água
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillText(watermarkText, x, y);
  
  // Adicionar símbolo web (um pequeno globo ou ícone)
  ctx.beginPath();
  ctx.arc(x - 15, y - 8, 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 100, 200, 0.7)';
  ctx.fill();
  ctx.stroke();
  
  // Desenhar "www" dentro do círculo
  ctx.fillStyle = 'white';
  ctx.font = 'bold 6px Arial';
  ctx.fillText('www', x - 22, y - 6);
}