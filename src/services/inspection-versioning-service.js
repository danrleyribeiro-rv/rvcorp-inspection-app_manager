// src/services/inspection-versioning-service.js
import { db } from '@/lib/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  serverTimestamp,
  onSnapshot 
} from 'firebase/firestore';

/**
 * Serviço para gerenciar versionamento entre coleções inspections e inspections_data
 */
export class InspectionVersioningService {
  
  /**
   * Puxa uma inspeção da coleção 'inspections' para 'inspections_data'
   * Mantém o mesmo ID do documento em ambas as coleções
   */
  static async pullInspectionData(inspectionId, managerId, pullNotes = '') {
    try {
      // 1. Buscar dados da inspeção original
      const originalInspectionRef = doc(db, 'inspections', inspectionId);
      const originalInspectionDoc = await getDoc(originalInspectionRef);
      
      if (!originalInspectionDoc.exists()) {
        throw new Error('Inspeção não encontrada na coleção original');
      }
      
      const originalData = originalInspectionDoc.data();
      
      // 2. Verificar se já existe uma versão em inspections_data
      const dataInspectionRef = doc(db, 'inspections_data', inspectionId);
      const dataInspectionDoc = await getDoc(dataInspectionRef);
      
      const currentVersion = dataInspectionDoc.exists() 
        ? (dataInspectionDoc.data().version || 0) + 1 
        : 1;
      
      // 3. Criar/atualizar documento em inspections_data
      const inspectionDataPayload = {
        ...originalData,
        // Metadados de versionamento
        version: currentVersion,
        source_inspection_id: inspectionId,
        source_last_updated: originalData.updated_at,
        pulled_at: serverTimestamp(),
        pulled_by: managerId,
        pull_notes: pullNotes,
        // Controle de mudanças
        has_changes_available: false,
        last_change_detected_at: null,
        // Status da cópia
        is_manager_copy: true,
        original_created_at: originalData.created_at,
        manager_updated_at: serverTimestamp()
      };
      
      await setDoc(dataInspectionRef, inspectionDataPayload);
      
      // 4. Criar registro do histórico de pulls
      const pullHistoryRef = doc(collection(db, 'inspection_pull_history'));
      await setDoc(pullHistoryRef, {
        inspection_id: inspectionId,
        version: currentVersion,
        pulled_at: serverTimestamp(),
        pulled_by: managerId,
        pull_notes: pullNotes,
        source_version_timestamp: originalData.updated_at,
        action: 'pull'
      });
      
      return {
        success: true,
        version: currentVersion,
        data: inspectionDataPayload
      };
      
    } catch (error) {
      console.error('Erro ao puxar dados da inspeção:', error);
      throw error;
    }
  }
  
  /**
   * Verifica se há mudanças na inspeção original desde o último pull
   */
  static async checkForChanges(inspectionId) {
    try {
      const originalRef = doc(db, 'inspections', inspectionId);
      const dataRef = doc(db, 'inspections_data', inspectionId);
      
      // Tentar buscar documento original
      const originalDoc = await getDoc(originalRef);
      if (!originalDoc.exists()) {
        return { hasChanges: false, error: 'Inspeção original não encontrada' };
      }
      
      // Tentar buscar documento de dados (pode não existir ainda)
      let dataDoc;
      try {
        dataDoc = await getDoc(dataRef);
      } catch (permissionError) {
        console.warn('Sem permissão para acessar inspections_data, assumindo primeira importação:', permissionError);
        return { 
          hasChanges: true, 
          isFirstPull: true,
          originalLastUpdated: originalDoc.data().updated_at?.toDate?.() || new Date(originalDoc.data().updated_at),
          needsSetup: true
        };
      }
      
      if (!dataDoc.exists()) {
        return { 
          hasChanges: true, 
          isFirstPull: true,
          originalLastUpdated: originalDoc.data().updated_at?.toDate?.() || new Date(originalDoc.data().updated_at)
        };
      }
      
      const originalData = originalDoc.data();
      const dataDocData = dataDoc.data();
      
      // Comparar timestamps de atualização
      const originalUpdated = originalData.updated_at?.toDate?.() || new Date(originalData.updated_at);
      const lastPulled = dataDocData.source_last_updated?.toDate?.() || new Date(dataDocData.source_last_updated);
      
      const hasChanges = originalUpdated > lastPulled;
      
      // Tentar marcar mudanças disponíveis (pode falhar por permissões)
      if (hasChanges && !dataDocData.has_changes_available) {
        try {
          await updateDoc(dataRef, {
            has_changes_available: true,
            last_change_detected_at: serverTimestamp()
          });
        } catch (updateError) {
          console.warn('Não foi possível marcar mudanças disponíveis:', updateError);
        }
      }
      
      return {
        hasChanges,
        isFirstPull: false,
        originalLastUpdated: originalUpdated,
        lastPulled: lastPulled,
        currentVersion: dataDocData.version || 0
      };
      
    } catch (error) {
      console.error('Erro ao verificar mudanças:', error);
      if (error.code === 'permission-denied') {
        return { 
          hasChanges: false, 
          error: 'Sem permissão para acessar dados de versionamento. Configure as regras do Firestore.',
          needsFirestoreSetup: true
        };
      }
      return { hasChanges: false, error: error.message };
    }
  }
  
  /**
   * Busca histórico de pulls de uma inspeção
   */
  static async getPullHistory(inspectionId) {
    try {
      const historyQuery = query(
        collection(db, 'inspection_pull_history'),
        where('inspection_id', '==', inspectionId),
        orderBy('pulled_at', 'desc')
      );
      
      const historySnapshot = await getDocs(historyQuery);
      const history = historySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        pulled_at: doc.data().pulled_at?.toDate?.() || new Date(doc.data().pulled_at)
      }));
      
      return history;
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      if (error.code === 'permission-denied') {
        console.warn('Sem permissão para acessar histórico, retornando array vazio');
        return [];
      }
      return [];
    }
  }
  
  /**
   * Compara duas versões de inspeção para mostrar diferenças
   */
  static compareInspectionVersions(originalData, currentData) {
    const changes = {
      general: {},
      structure: {},
      summary: {
        totalChanges: 0,
        hasGeneralChanges: false,
        hasStructureChanges: false
      }
    };
    
    // Comparar informações gerais
    const generalFields = ['title', 'area', 'observation'];
    generalFields.forEach(field => {
      if (originalData[field] !== currentData[field]) {
        changes.general[field] = {
          original: currentData[field] || '',
          updated: originalData[field] || '',
          changed: true
        };
        changes.summary.totalChanges++;
        changes.summary.hasGeneralChanges = true;
      }
    });
    
    // Comparar estrutura (tópicos, itens, detalhes)
    const originalTopics = originalData.topics || [];
    const currentTopics = currentData.topics || [];
    
    if (JSON.stringify(originalTopics) !== JSON.stringify(currentTopics)) {
      changes.structure.topics = {
        original: currentTopics,
        updated: originalTopics,
        changed: true
      };
      changes.summary.totalChanges++;
      changes.summary.hasStructureChanges = true;
    }
    
    return changes;
  }
  
  /**
   * Busca dados de uma versão específica de uma inspeção
   */
  static async getVersionSnapshot(inspectionId, version) {
    try {
      // Buscar no histórico de pull a versão específica
      const historyQuery = query(
        collection(db, 'inspection_pull_history'),
        where('inspection_id', '==', inspectionId),
        where('version', '==', version)
      );
      
      const historySnapshot = await getDocs(historyQuery);
      if (historySnapshot.empty) {
        throw new Error(`Versão ${version} não encontrada no histórico`);
      }
      
      const versionDoc = historySnapshot.docs[0];
      const versionData = versionDoc.data();
      
      // Para encontrar o snapshot da versão, precisamos acessar uma coleção de snapshots
      // ou reconstruir baseado no histórico
      // Por enquanto, vamos usar os dados disponíveis no histórico
      return {
        id: versionDoc.id,
        version: versionData.version,
        pulled_at: versionData.pulled_at?.toDate?.() || new Date(versionData.pulled_at),
        pulled_by: versionData.pulled_by,
        pull_notes: versionData.pull_notes,
        source_version_timestamp: versionData.source_version_timestamp
      };
    } catch (error) {
      console.error('Erro ao buscar snapshot da versão:', error);
      throw error;
    }
  }

  /**
   * Restaura uma versão específica da inspeção
   */
  static async restoreVersion(inspectionId, targetVersion, managerId, restoreNotes = '') {
    try {
      // 1. Buscar dados da versão alvo (se existe um sistema de snapshots)
      // Por enquanto, vamos criar uma nova versão baseada na versão original
      const originalInspectionRef = doc(db, 'inspections', inspectionId);
      const originalInspectionDoc = await getDoc(originalInspectionRef);
      
      if (!originalInspectionDoc.exists()) {
        throw new Error('Inspeção original não encontrada');
      }
      
      const originalData = originalInspectionDoc.data();
      
      // 2. Buscar versão atual para incrementar
      const dataInspectionRef = doc(db, 'inspections_data', inspectionId);
      const dataInspectionDoc = await getDoc(dataInspectionRef);
      
      if (!dataInspectionDoc.exists()) {
        throw new Error('Nenhuma versão importada encontrada para restaurar');
      }
      
      const currentVersion = dataInspectionDoc.data().version || 0;
      const newVersion = currentVersion + 1;
      
      // 3. Criar nova versão marcada como restauração
      const restoredDataPayload = {
        ...originalData,
        // Metadados de versionamento
        version: newVersion,
        source_inspection_id: inspectionId,
        source_last_updated: originalData.updated_at,
        pulled_at: serverTimestamp(),
        pulled_by: managerId,
        pull_notes: restoreNotes,
        // Marcação de restauração
        is_restore: true,
        restored_from_version: targetVersion,
        restore_notes: restoreNotes,
        // Controle de mudanças
        has_changes_available: false,
        last_change_detected_at: null,
        // Status da cópia
        is_manager_copy: true,
        original_created_at: originalData.created_at,
        manager_updated_at: serverTimestamp()
      };
      
      // 3. Atualizar documento e criar histórico em paralelo
      const pullHistoryRef = doc(collection(db, 'inspection_pull_history'));
      
      await Promise.all([
        setDoc(dataInspectionRef, restoredDataPayload),
        setDoc(pullHistoryRef, {
          inspection_id: inspectionId,
          version: newVersion,
          pulled_at: serverTimestamp(),
          pulled_by: managerId,
          pull_notes: restoreNotes,
          source_version_timestamp: originalData.updated_at,
          action: 'restore',
          restored_from_version: targetVersion,
          restore_notes: restoreNotes
        })
      ]);
      
      // 4. Aguardar um pouco para garantir que o Firestore processou
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        version: newVersion,
        restoredFromVersion: targetVersion,
        data: restoredDataPayload
      };
      
    } catch (error) {
      console.error('Erro ao restaurar versão:', error);
      throw error;
    }
  }

  /**
   * Listener para mudanças em tempo real na inspeção original
   */
  static createChangeListener(inspectionId, onChangeDetected) {
    const originalRef = doc(db, 'inspections', inspectionId);
    
    return onSnapshot(originalRef, async (doc) => {
      if (doc.exists()) {
        const changeCheck = await this.checkForChanges(inspectionId);
        if (changeCheck.hasChanges) {
          onChangeDetected(changeCheck);
        }
      }
    });
  }
  
  /**
   * Gera preview da inspeção atual vs. versão que seria puxada
   */
  static async generatePreviewData(inspectionId) {
    try {
      // Buscar documento original
      const originalDoc = await getDoc(doc(db, 'inspections', inspectionId));
      if (!originalDoc.exists()) {
        throw new Error('Inspeção original não encontrada');
      }
      
      // Tentar buscar documento de dados (pode falhar por permissões)
      let dataDoc = null;
      let currentData = null;
      
      try {
        dataDoc = await getDoc(doc(db, 'inspections_data', inspectionId));
        currentData = dataDoc.exists() ? dataDoc.data() : null;
      } catch (permissionError) {
        console.warn('Sem permissão para acessar inspections_data, assumindo primeira importação:', permissionError);
        currentData = null;
      }
      
      const originalData = originalDoc.data();
      
      const preview = {
        original: originalData,
        current: currentData,
        isFirstPull: !currentData,
        changes: currentData ? this.compareInspectionVersions(originalData, currentData) : null,
        statistics: {
          totalTopics: originalData.topics?.length || 0,
          totalItems: originalData.topics?.reduce((acc, topic) => {
            // Se é estrutura direta, não há itens, senão contar itens
            return acc + (topic.direct_details ? 0 : (topic.items?.length || 0));
          }, 0) || 0,
          totalDetails: originalData.topics?.reduce((acc, topic) => {
            if (topic.direct_details && topic.details) {
              // Estrutura direta: tópico → detalhes
              return acc + topic.details.length;
            } else if (topic.items) {
              // Estrutura tradicional: tópico → itens → detalhes
              return acc + topic.items.reduce((itemAcc, item) => itemAcc + (item.details?.length || 0), 0);
            }
            return acc;
          }, 0) || 0,
          lastUpdated: originalData.updated_at
        },
        needsFirestoreSetup: !dataDoc && permissionError?.code === 'permission-denied'
      };
      
      return preview;
    } catch (error) {
      console.error('Erro ao gerar preview:', error);
      if (error.code === 'permission-denied') {
        throw new Error('Sem permissão para acessar dados. Configure as regras do Firestore.');
      }
      throw error;
    }
  }
}

export default InspectionVersioningService;