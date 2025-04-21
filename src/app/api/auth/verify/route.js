// src/app/api/auth/verify/route.js
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Inicializar Firebase Admin apenas uma vez
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function POST(request) {
  try {
    const { idToken } = await request.json();
    
    if (!idToken) {
      return NextResponse.json(
        { error: 'Token não fornecido' }, 
        { status: 401 }
      );
    }

    // Verificar o token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    return NextResponse.json({ 
      valid: true, 
      uid: decodedToken.uid,
      email: decodedToken.email
    });
    
  } catch (error) {
    console.error('Erro na verificação do token:', error);
    return NextResponse.json(
      { error: 'Token inválido', message: error.message }, 
      { status: 401 }
    );
  }
}