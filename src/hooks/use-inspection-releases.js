// src/hooks/use-inspection-releases.js
"use client";

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';

export function useInspectionReleases() {
  const [loading, setLoading] = useState(false);
  const [releases, setReleases] = useState([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchReleases = async (inspectionId) => {
    try {
      const releasesQuery = query(
        collection(db, 'inspection_releases'),
        where('inspection_id', '==', inspectionId),
        orderBy('created_at', 'desc')
      );
      
      const snapshot = await getDocs(releasesQuery);
      const releasesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || null
      }));
      
      setReleases(releasesData);
      return releasesData;
    } catch (error) {
      console.error("Error fetching releases:", error);
      return [];
    }
  };

  const createRelease = async (inspectionId, inspection, releaseNotes) => {
    setLoading(true);
    try {
      const releaseData = {
        inspection_id: inspectionId,
        inspection_snapshot: inspection,
        release_notes: releaseNotes,
        created_by: user.uid,
        created_at: serverTimestamp(),
        version: Date.now(),
        is_delivered: false,
        delivered_at: null
      };

      await addDoc(collection(db, 'inspection_releases'), releaseData);

      const inspectionRef = doc(db, 'inspections', inspectionId);
      await updateDoc(inspectionRef, {
        inspection_edit_blocked: false,
        last_editor: user.uid,
        updated_at: serverTimestamp()
      });

      toast({
        title: "Release criado com sucesso"
      });

      await fetchReleases(inspectionId);
      return { success: true };
    } catch (error) {
      console.error("Error creating release:", error);
      toast({
        title: "Erro ao criar release",
        description: error.message,
        variant: "destructive"
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const deliverRelease = async (releaseId, inspectionId) => {
    setLoading(true);
    try {
      // Marcar release como entregue
      const releaseRef = doc(db, 'inspection_releases', releaseId);
      await updateDoc(releaseRef, {
        is_delivered: true,
        delivered_at: serverTimestamp(),
        delivered_by: user.uid
      });

      // Atualizar inspeção
      const inspectionRef = doc(db, 'inspections', inspectionId);
      await updateDoc(inspectionRef, {
        delivered: true,
        delivered_at: serverTimestamp(),
        delivered_release_id: releaseId,
        last_editor: user.uid,
        updated_at: serverTimestamp()
      });

      toast({
        title: "Release entregue ao cliente"
      });

      await fetchReleases(inspectionId);
      return { success: true };
    } catch (error) {
      console.error("Error delivering release:", error);
      toast({
        title: "Erro ao entregar release",
        description: error.message,
        variant: "destructive"
      });
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

const revertDelivery = async (releaseId, inspectionId) => {
  setLoading(true);
  try {
    // Reverter entrega do release
    const releaseRef = doc(db, 'inspection_releases', releaseId);
    await updateDoc(releaseRef, {
      is_delivered: false,
      delivered_at: null,
      delivered_by: null
    });

    // Reverter entrega da inspeção
    const inspectionRef = doc(db, 'inspections', inspectionId);
    await updateDoc(inspectionRef, {
      delivered: false,
      delivered_at: null,
      delivered_release_id: null,
      last_editor: user.uid,
      updated_at: serverTimestamp()
    });

    toast({
      title: "Entrega revertida com sucesso"
    });

    await fetchReleases(inspectionId);
    return { success: true };
  } catch (error) {
    console.error("Error reverting delivery:", error);
    toast({
      title: "Erro ao reverter entrega",
      description: error.message,
      variant: "destructive"
    });
    return { success: false, error: error.message };
  } finally {
    setLoading(false);
  }
};

  const toggleEditBlock = async (inspectionId, blocked) => {
    setLoading(true);
    try {
      const inspectionRef = doc(db, 'inspections', inspectionId);
      await updateDoc(inspectionRef, {
        inspection_edit_blocked: blocked,
        last_editor: user.uid,
        updated_at: serverTimestamp()
      });

      toast({
        title: blocked ? "Edição bloqueada" : "Edição liberada"
      });

      return { success: true };
    } catch (error) {
      console.error("Error toggling edit block:", error);
      toast({
        title: "Erro ao alterar bloqueio",
        description: error.message,
        variant: "destructive"
      });
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return {
    createRelease,
    deliverRelease,
    revertDelivery,
    toggleEditBlock,
    fetchReleases,
    releases,
    loading
  };
}