// src/app/api/watermark/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { imageUrl, inspectionId, source = 'files' } = await request.json();

    if (!imageUrl || !inspectionId) {
      return NextResponse.json(
        { success: false, error: 'URL da imagem e ID da inspeção são obrigatórios' },
        { status: 400 }
      );
    }

    // Baixando imagem do Firebase

    // Baixar a imagem com headers apropriados
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; InspectionApp/1.0)',
        'Accept': 'image/*,*/*;q=0.8',
      },
    });

    if (!imageResponse.ok) {
      throw new Error(`Falha ao baixar imagem: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    const contentType = imageResponse.headers.get('content-type');

    // Verificar se é realmente uma imagem
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error(`Tipo de arquivo inválido: ${contentType}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    
    if (imageBuffer.byteLength === 0) {
      throw new Error('Imagem está vazia');
    }

    // Imagem baixada com sucesso

    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    const dataURL = `data:${contentType};base64,${imageBase64}`;

    return NextResponse.json({
      success: true,
      dataURL,
      mimeType: contentType,
      size: imageBuffer.byteLength
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}