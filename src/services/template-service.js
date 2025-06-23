// src/services/template-service.js
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    addDoc, 
    updateDoc, 
    query, 
    where, 
    orderBy, 
    serverTimestamp 
  } from "firebase/firestore";
  import { db } from "@/lib/firebase";
  
  // Convert Firestore timestamp to ISO string
  const formatTimestamp = (timestamp) => {
    return timestamp ? timestamp.toDate().toISOString() : null;
  };
  
  // Format template data from Firestore
  const formatTemplateData = (doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      created_at: formatTimestamp(data.created_at),
      updated_at: formatTimestamp(data.updated_at),
      deleted_at: formatTimestamp(data.deleted_at),
    };
  };
  
  export const templateService = {
    // Get all templates
    async getTemplates() {
      try {
        const templatesQuery = query(
          collection(db, 'templates'),
          where('deleted_at', '==', null),
          orderBy('title')
        );
        
        const snapshot = await getDocs(templatesQuery);
        return snapshot.docs.map(formatTemplateData);
      } catch (error) {
        // Remove console.error - error will be handled by calling component
        throw new Error(`Erro ao buscar templates: ${error.message}`);
      }
    },
  
    // Get a single template by ID
    async getTemplateById(id) {
      try {
        const templateRef = doc(db, 'templates', id);
        const templateDoc = await getDoc(templateRef);
        
        if (!templateDoc.exists()) {
          throw new Error("Template not found");
        }
        
        return formatTemplateData(templateDoc);
      } catch (error) {
        // Remove console.error - error will be handled by calling component
        throw new Error(`Erro ao buscar template ${id}: ${error.message}`);
      }
    },
  
    // Create a new template
    async createTemplate(templateData) {
      try {
        const dataToSave = {
          ...templateData,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          deleted_at: null
        };
        
        const docRef = await addDoc(collection(db, 'templates'), dataToSave);
        return { id: docRef.id, ...dataToSave };
      } catch (error) {
        // Remove console.error - error will be handled by calling component
        throw new Error(`Erro ao criar template: ${error.message}`);
      }
    },
  
    // Update an existing template
    async updateTemplate(id, templateData) {
      try {
        const templateRef = doc(db, 'templates', id);
        
        const dataToUpdate = {
          ...templateData,
          updated_at: serverTimestamp()
        };
        
        await updateDoc(templateRef, dataToUpdate);
        return { id, ...dataToUpdate };
      } catch (error) {
        // Remove console.error - error will be handled by calling component
        throw new Error(`Erro ao atualizar template ${id}: ${error.message}`);
      }
    },
  
    // Soft delete a template
    async deleteTemplate(id) {
      try {
        const templateRef = doc(db, 'templates', id);
        
        await updateDoc(templateRef, {
          deleted_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
        
        return { success: true };
      } catch (error) {
        // Remove console.error - error will be handled by calling component
        throw new Error(`Erro ao excluir template ${id}: ${error.message}`);
      }
    }
  };