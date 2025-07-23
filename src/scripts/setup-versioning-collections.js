// src/scripts/setup-versioning-collections.js
/**
 * Script para configurar as coleções necessárias para o sistema de versionamento
 * Execute este script uma vez para criar as coleções iniciais no Firestore
 */

import { db } from '@/lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function setupVersioningCollections() {
  try {
    console.log('Configurando coleções para sistema de versionamento...');

    // 1. Criar documento exemplo em inspections_data para inicializar a coleção
    const inspectionsDataRef = doc(collection(db, 'inspections_data'), '_init');
    await setDoc(inspectionsDataRef, {
      _type: 'initialization_document',
      _created_at: serverTimestamp(),
      _description: 'Documento de inicialização - pode ser removido após primeiro uso real'
    });

    // 2. Criar documento exemplo em inspection_pull_history para inicializar a coleção
    const pullHistoryRef = doc(collection(db, 'inspection_pull_history'), '_init');
    await setDoc(pullHistoryRef, {
      _type: 'initialization_document', 
      _created_at: serverTimestamp(),
      _description: 'Documento de inicialização - pode ser removido após primeiro uso real'
    });

    console.log('✅ Coleções criadas com sucesso!');
    console.log('📝 Agora você precisa configurar as regras do Firestore:');
    console.log(`
// Adicione estas regras ao seu firestore.rules:

// Coleção para dados de inspeções gerenciadas pelos managers
match /inspections_data/{inspectionId} {
  allow read, write: if request.auth != null 
    && exists(/databases/$(database)/documents/managers/$(request.auth.uid));
}

// Coleção para histórico de pulls
match /inspection_pull_history/{historyId} {
  allow read, write: if request.auth != null 
    && exists(/databases/$(database)/documents/managers/$(request.auth.uid));
}
    `);

    return { success: true };
  } catch (error) {
    console.error('Erro ao configurar coleções:', error);
    throw error;
  }
}

// Se executado diretamente
if (typeof window !== 'undefined') {
  window.setupVersioningCollections = setupVersioningCollections;
}