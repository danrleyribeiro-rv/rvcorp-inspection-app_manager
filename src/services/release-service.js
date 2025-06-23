import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const releaseService = {
  async createRelease(inspectionId, inspectionData, releaseNotes, userId) {
    try {
      const releaseData = {
        inspection_id: inspectionId,
        inspection_snapshot: inspectionData,
        release_notes: releaseNotes,
        created_by: userId,
        created_at: serverTimestamp(),
        version: Date.now()
      };

      const docRef = await addDoc(collection(db, 'inspection_releases'), releaseData);
      
      // Atualizar inspeção
      const inspectionRef = doc(db, 'inspections', inspectionId);
      await updateDoc(inspectionRef, {
        inspection_edit_blocked: false,
        last_editor: userId,
        updated_at: serverTimestamp()
      });

      return { success: true, id: docRef.id };
    } catch (error) {
      throw new Error(`Erro ao criar release: ${error.message}`);
    }
  },

  async getReleases(inspectionId) {
    try {
      const releasesQuery = query(
        collection(db, 'inspection_releases'),
        where('inspection_id', '==', inspectionId),
        orderBy('created_at', 'desc')
      );
      
      const snapshot = await getDocs(releasesQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || null
      }));
    } catch (error) {
      throw new Error(`Erro ao buscar releases: ${error.message}`);
    }
  }
};
