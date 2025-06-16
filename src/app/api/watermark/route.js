// src/app/api/watermark/route.js
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK (optional for development)
let adminInitialized = false;
if (!admin.apps.length) {
  try {
    // Try to initialize with service account if available
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
      adminInitialized = true;
      console.log('Firebase Admin initialized with service account');
    } else {
      console.log('Firebase Admin credentials not available, upload will be disabled');
    }
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error);
    adminInitialized = false;
  }
}

export async function POST(request) {
  try {
    const { 
      imageUrl, 
      inspectionId, 
      source = 'files', 
      processWatermark = false,
      uploadToFirebase = false,
      storagePath = null
    } = await request.json();

    if (!imageUrl || !inspectionId) {
      return NextResponse.json(
        { error: 'imageUrl and inspectionId are required' },
        { status: 400 }
      );
    }

    console.log('Processing image:', imageUrl);

    // Fetch the image from Firebase Storage or other URL
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      console.error('Failed to fetch image:', imageResponse.status, imageResponse.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch image' },
        { status: 404 }
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    
    if (!processWatermark) {
      // Just return the image as data URL for client-side processing
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
      const dataURL = `data:${mimeType};base64,${imageBase64}`;

      return NextResponse.json({
        success: true,
        dataURL,
        mimeType
      });
    }

    // Process watermark on server using Sharp
    try {
      // Get current date and time
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR');
      const timeStr = now.toLocaleTimeString('pt-BR', { hour12: false });
      
      // Determine emoji and text based on source
      const sourceConfig = {
        camera: {
          text: `[📷][${dateStr} ${timeStr}]`
        },
        files: {
          text: `[📁][${dateStr} ${timeStr}]`
        }
      };
      
      const config = sourceConfig[source] || sourceConfig.files;
      const watermarkText = config.text;

      // Get image metadata
      const image = sharp(Buffer.from(imageBuffer));
      const metadata = await image.metadata();
      
      // Calculate font size based on image width (responsive)
      const fontSize = Math.max(14, Math.floor(metadata.width * 0.018));
      const padding = 15;
      
      // Create watermark SVG
      const watermarkSvg = `
        <svg width="${metadata.width}" height="${metadata.height}">
          <defs>
            <style>
              .watermark-text {
                font-family: Arial, sans-serif;
                font-size: ${fontSize}px;
                font-weight: bold;
                fill: white;
              }
            </style>
          </defs>
          <rect x="${metadata.width - (watermarkText.length * fontSize * 0.6) - padding * 2}" 
                y="${metadata.height - fontSize - padding * 2}" 
                width="${watermarkText.length * fontSize * 0.6 + padding * 2}" 
                height="${fontSize + padding * 2}" 
                fill="rgba(0,0,0,0.8)" 
                rx="6" ry="6"/>
          <text x="${metadata.width - (watermarkText.length * fontSize * 0.6) - padding}" 
                y="${metadata.height - padding}" 
                class="watermark-text">${watermarkText}</text>
        </svg>
      `;

      // Apply watermark
      const watermarkedImageBuffer = await image
        .composite([{
          input: Buffer.from(watermarkSvg),
          gravity: 'southeast'
        }])
        .jpeg({ quality: 95 })
        .toBuffer();

      let downloadURL = null;
      
      // If upload to Firebase is requested and admin is initialized
      if (uploadToFirebase && storagePath && adminInitialized) {
        try {
          const bucket = admin.storage().bucket();
          const file = bucket.file(storagePath);
          
          await file.save(watermarkedImageBuffer, {
            metadata: {
              contentType: 'image/jpeg',
            },
          });
          
          // Make the file publicly readable
          await file.makePublic();
          
          // Get the public URL
          downloadURL = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
          
          console.log('Image uploaded successfully to:', downloadURL);
          
        } catch (uploadError) {
          console.error('Firebase upload failed:', uploadError);
          // Continue without upload, return dataURL instead
        }
      } else if (uploadToFirebase && !adminInitialized) {
        console.log('Upload requested but Firebase Admin not initialized');
      }
      
      // Convert to base64
      const watermarkedBase64 = watermarkedImageBuffer.toString('base64');
      const dataURL = `data:image/jpeg;base64,${watermarkedBase64}`;

      return NextResponse.json({
        success: true,
        dataURL,
        downloadURL,
        mimeType: 'image/jpeg',
        watermarkApplied: true,
        uploaded: !!downloadURL
      });

    } catch (sharpError) {
      console.error('Sharp processing failed:', sharpError);
      
      // Fallback to returning raw image for client-side processing
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
      const dataURL = `data:${mimeType};base64,${imageBase64}`;

      return NextResponse.json({
        success: true,
        dataURL,
        mimeType,
        watermarkApplied: false,
        fallback: true
      });
    }

  } catch (error) {
    console.error('Error in watermark API:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}