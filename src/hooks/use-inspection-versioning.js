// src/hooks/use-inspection-versioning.js
import { useState, useEffect, useCallback } from 'react';
import InspectionVersioningService from '@/services/inspection-versioning-service';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook personalizado para gerenciar versionamento de inspeções
 */
export const useInspectionVersioning = (inspectionId) => {
  const [loading, setLoading] = useState(false);
  const [checkingChanges, setCheckingChanges] = useState(false);
  const [changeInfo, setChangeInfo] = useState(null);
  const [pullHistory, setPullHistory] = useState([]);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Verificar mudanças
  const checkForChanges = useCallback(async () => {
    if (!inspectionId) return;
    
    setCheckingChanges(true);
    try {
      const changes = await InspectionVersioningService.checkForChanges(inspectionId);
      setChangeInfo(changes);
      return changes;
    } catch (error) {
      console.error('Erro ao verificar mudanças:', error);
      toast({
        title: "Erro ao verificar mudanças",
        description: error.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setCheckingChanges(false);
    }
  }, [inspectionId, toast]);

  // Carregar histórico de pulls
  const loadPullHistory = useCallback(async () => {
    if (!inspectionId) return;
    
    try {
      const history = await InspectionVersioningService.getPullHistory(inspectionId);
      setPullHistory(history);
      return history;
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      return [];
    }
  }, [inspectionId]);

  // Carregar versão atual
  const loadCurrentVersion = useCallback(async () => {
    if (!inspectionId) return;
    
    try {
      const { db } = await import('@/lib/firebase');
      const { doc, getDoc } = await import('firebase/firestore');
      
      const dataRef = doc(db, 'inspections_data', inspectionId);
      const dataDoc = await getDoc(dataRef);
      
      if (dataDoc.exists()) {
        const version = dataDoc.data();
        setCurrentVersion(version);
        return version;
      }
      return null;
    } catch (error) {
      console.error('Erro ao carregar versão atual:', error);
      return null;
    }
  }, [inspectionId]);

  // Gerar preview
  const generatePreview = useCallback(async () => {
    if (!inspectionId) return null;
    
    setLoading(true);
    try {
      const preview = await InspectionVersioningService.generatePreviewData(inspectionId);
      setPreviewData(preview);
      return preview;
    } catch (error) {
      console.error('Erro ao gerar preview:', error);
      toast({
        title: "Erro ao gerar preview",
        description: error.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [inspectionId, toast]);

  // Executar pull da inspeção
  const pullInspection = useCallback(async (pullNotes = '') => {
    if (!inspectionId || !user?.uid) return null;
    
    setLoading(true);
    try {
      const result = await InspectionVersioningService.pullInspectionData(
        inspectionId, 
        user.uid, 
        pullNotes
      );
      
      // Recarregar dados após o pull
      await Promise.all([
        checkForChanges(),
        loadPullHistory(),
        loadCurrentVersion()
      ]);
      
      toast({
        title: "Inspeção sincronizada",
        description: `Versão ${result.version} criada com sucesso.`
      });
      
      return result;
    } catch (error) {
      console.error('Erro ao puxar inspeção:', error);
      toast({
        title: "Erro ao sincronizar",
        description: error.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [inspectionId, user?.uid, checkForChanges, loadPullHistory, loadCurrentVersion, toast]);

  // Criar listener para mudanças em tempo real
  const createChangeListener = useCallback((onChangeDetected) => {
    if (!inspectionId) return null;
    
    return InspectionVersioningService.createChangeListener(inspectionId, onChangeDetected);
  }, [inspectionId]);

  // Buscar snapshot de uma versão específica
  const getVersionSnapshot = useCallback(async (version) => {
    if (!inspectionId) return null;
    
    try {
      const snapshot = await InspectionVersioningService.getVersionSnapshot(inspectionId, version);
      return snapshot;
    } catch (error) {
      console.error('Erro ao buscar snapshot da versão:', error);
      toast({
        title: "Erro ao buscar versão",
        description: error.message,
        variant: "destructive"
      });
      return null;
    }
  }, [inspectionId, toast]);

  // Restaurar uma versão específica
  const restoreVersion = useCallback(async (targetVersion, restoreNotes = '') => {
    if (!inspectionId || !user?.uid) return null;
    
    setLoading(true);
    try {
      const result = await InspectionVersioningService.restoreVersion(
        inspectionId, 
        targetVersion, 
        user.uid, 
        restoreNotes
      );
      
      // Recarregar dados após a restauração
      await Promise.all([
        checkForChanges(),
        loadPullHistory(),
        loadCurrentVersion()
      ]);
      
      toast({
        title: "Versão restaurada",
        description: `Versão ${result.version} criada a partir da versão ${targetVersion}.`
      });
      
      return result;
    } catch (error) {
      console.error('Erro ao restaurar versão:', error);
      toast({
        title: "Erro ao restaurar versão",
        description: error.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [inspectionId, user?.uid, checkForChanges, loadPullHistory, loadCurrentVersion, toast]);

  // Inicializar dados quando o inspectionId muda
  useEffect(() => {
    if (inspectionId) {
      checkForChanges();
      loadPullHistory();
      loadCurrentVersion();
    }
  }, [inspectionId, checkForChanges, loadPullHistory, loadCurrentVersion]);

  // Estado de status resumido
  const status = (() => {
    if (checkingChanges) return 'checking';
    if (!changeInfo) return 'unknown';
    if (changeInfo.error) return 'error';
    if (changeInfo.isFirstPull) return 'first-pull';
    if (changeInfo.hasChanges) return 'has-changes';
    return 'up-to-date';
  })();

  const hasUpdatesAvailable = changeInfo?.hasChanges || changeInfo?.isFirstPull;

  return {
    // Estados
    loading,
    checkingChanges,
    changeInfo,
    pullHistory,
    currentVersion,
    previewData,
    status,
    hasUpdatesAvailable,
    
    // Ações
    checkForChanges,
    loadPullHistory,
    loadCurrentVersion,
    generatePreview,
    pullInspection,
    createChangeListener,
    getVersionSnapshot,
    restoreVersion,
    
    // Utilitários
    isFirstPull: changeInfo?.isFirstPull || false,
    hasChanges: changeInfo?.hasChanges || false,
    lastUpdated: changeInfo?.originalLastUpdated,
    lastPulled: changeInfo?.lastPulled,
    currentVersionNumber: currentVersion?.version || 0
  };
};

export default useInspectionVersioning;