// src/services/code-service.js
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  query,
  where,
  getDocs
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

  // Cria inspeção com código automático
  async createInspectionWithCode(inspectionData) {
    try {
      const code = await generateInspectionCode();
      
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