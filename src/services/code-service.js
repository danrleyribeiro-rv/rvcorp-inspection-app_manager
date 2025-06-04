// src/services/code-service.js
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  query,
  where,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateTemplateCode, generateInspectionCode } from '@/utils/codeGenerator';

export const codeService = {
  // Cria template com código automático
  async createTemplateWithCode(templateData) {
    try {
      const code = await generateTemplateCode();
      
      const dataToSave = {
        ...templateData,
        cod: code,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        deleted_at: null
      };
      
      const docRef = await addDoc(collection(db, 'templates'), dataToSave);
      
      return {
        success: true,
        id: docRef.id,
        code,
        data: dataToSave
      };
    } catch (error) {
      console.error('Error creating template with code:', error);
      throw error;
    }
  },

  // Cria inspeção com código automático (incluindo template)
  async createInspectionWithCode(inspectionData) {
    try {
      let templateCode = null;
      
      // Se há template_id, busca o código do template
      if (inspectionData.template_id) {
        const templateRef = doc(db, 'templates', inspectionData.template_id);
        const templateDoc = await getDoc(templateRef);
        
        if (templateDoc.exists()) {
          templateCode = templateDoc.data().cod;
        }
      }
      
      // Gera código da inspeção com ou sem template
      const code = await generateInspectionCode(
        inspectionData.scheduled_date ? new Date(inspectionData.scheduled_date) : new Date(),
        templateCode
      );
      
      const dataToSave = {
        ...inspectionData,
        cod: code,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        deleted_at: null
      };
      
      const docRef = await addDoc(collection(db, 'inspections'), dataToSave);
      
      return {
        success: true,
        id: docRef.id,
        code,
        data: dataToSave
      };
    } catch (error) {
      console.error('Error creating inspection with code:', error);
      throw error;
    }
  },

  // Gera código único para uma coleção
  async generateUniqueCode(collectionName, options = {}) {
    const maxAttempts = 10;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        let code;
        
        if (collectionName === 'templates') {
          code = await generateTemplateCode();
        } else if (collectionName === 'inspections') {
          const { date, templateCode } = options;
          code = await generateInspectionCode(date, templateCode);
        } else {
          throw new Error(`Unsupported collection: ${collectionName}`);
        }
        
        // Verifica se código já existe
        const exists = await this.codeExists(code, collectionName);
        if (!exists) {
          return code;
        }
        
        attempts++;
      } catch (error) {
        console.error(`Attempt ${attempts + 1} failed:`, error);
        attempts++;
      }
    }
    
    throw new Error(`Failed to generate unique code after ${maxAttempts} attempts`);
  },

  // Verifica se código existe
  async codeExists(code, collectionName) {
    try {
      const q = query(
        collection(db, collectionName),
        where('cod', '==', code),
        where('deleted_at', '==', null)
      );
      
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking code existence:', error);
      return false;
    }
  },

  // Atualiza código manualmente (se necessário)
  async updateCode(collectionName, documentId, newCode) {
    try {
      const docRef = doc(db, collectionName, documentId);
      
      await updateDoc(docRef, {
        cod: newCode,
        updated_at: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating code:', error);
      throw error;
    }
  },

  // Busca documentos por código
  async findByCode(collectionName, code) {
    try {
      const q = query(
        collection(db, collectionName),
        where('cod', '==', code),
        where('deleted_at', '==', null)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return { success: true, data: null };
      }
      
      const doc = snapshot.docs[0];
      return {
        success: true,
        data: {
          id: doc.id,
          ...doc.data()
        }
      };
    } catch (error) {
      console.error('Error finding by code:', error);
      throw error;
    }
  }
};