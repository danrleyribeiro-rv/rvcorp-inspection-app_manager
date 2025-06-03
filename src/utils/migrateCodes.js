// src/utils/migrateCodes.js
import { db } from '@/lib/firebase';
import { collection, getDocs, updateDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { generateTemplateCode, generateInspectionCode } from './codeGenerator';

/**
 * Script de migração para adicionar códigos aos documentos existentes
 * Execute uma vez após implementar o sistema de códigos
 */

export const migrateTemplateCodes = async () => {
  try {
    console.log('Iniciando migração de códigos para templates...');
    
    // Buscar todos os templates sem código
    const templatesQuery = query(
      collection(db, 'templates'),
      where('deleted_at', '==', null)
    );
    
    const snapshot = await getDocs(templatesQuery);
    let count = 0;
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      
      // Se já tem código, pular
      if (data.cod) {
        console.log(`Template ${docSnapshot.id} já tem código: ${data.cod}`);
        continue;
      }
      
      // Gerar novo código
      const newCode = await generateTemplateCode();
      
      // Atualizar documento
      await updateDoc(doc(db, 'templates', docSnapshot.id), {
        cod: newCode
      });
      
      console.log(`Template ${docSnapshot.id} atualizado com código: ${newCode}`);
      count++;
    }
    
    console.log(`Migração de templates concluída. ${count} templates atualizados.`);
    return { success: true, updated: count };
  } catch (error) {
    console.error('Erro na migração de templates:', error);
    return { success: false, error: error.message };
  }
};

export const migrateInspectionCodes = async () => {
  try {
    console.log('Iniciando migração de códigos para inspeções...');
    
    // Buscar todas as inspeções sem código, ordenadas por data de criação
    const inspectionsQuery = query(
      collection(db, 'inspections'),
      where('deleted_at', '==', null),
      orderBy('created_at', 'asc')
    );
    
    const snapshot = await getDocs(inspectionsQuery);
    let count = 0;
    const dateSequenceMap = new Map(); // Para controlar sequência por data
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      
      // Se já tem código, pular
      if (data.cod) {
        console.log(`Inspeção ${docSnapshot.id} já tem código: ${data.cod}`);
        continue;
      }
      
      // Usar data de criação ou data atual
      const createdAt = data.created_at?.toDate() || new Date();
      const dateKey = createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Gerar código baseado na data de criação
      let newCode;
      if (dateSequenceMap.has(dateKey)) {
        // Incrementar sequência para o mesmo dia
        const currentSequence = dateSequenceMap.get(dateKey);
        const nextSequence = currentSequence + 1;
        dateSequenceMap.set(dateKey, nextSequence);
        
        const year = createdAt.getFullYear().toString().slice(-2);
        const month = (createdAt.getMonth() + 1).toString().padStart(2, '0');
        const day = createdAt.getDate().toString().padStart(2, '0');
        const dateCode = `${year}${month}${day}`;
        
        newCode = `INSP${dateCode}-${nextSequence.toString().padStart(3, '0')}`;
      } else {
        // Primeira inspeção do dia
        dateSequenceMap.set(dateKey, 1);
        newCode = await generateInspectionCode(createdAt);
      }
      
      // Atualizar documento
      await updateDoc(doc(db, 'inspections', docSnapshot.id), {
        cod: newCode
      });
      
      console.log(`Inspeção ${docSnapshot.id} atualizada com código: ${newCode}`);
      count++;
    }
    
    console.log(`Migração de inspeções concluída. ${count} inspeções atualizadas.`);
    return { success: true, updated: count };
  } catch (error) {
    console.error('Erro na migração de inspeções:', error);
    return { success: false, error: error.message };
  }
};

// Função principal para executar toda a migração
export const runCodeMigration = async () => {
  try {
    console.log('=== INICIANDO MIGRAÇÃO COMPLETA DE CÓDIGOS ===');
    
    // Migrar templates primeiro
    const templatesResult = await migrateTemplateCodes();
    if (!templatesResult.success) {
      throw new Error(`Erro na migração de templates: ${templatesResult.error}`);
    }
    
    // Migrar inspeções
    const inspectionsResult = await migrateInspectionCodes();
    if (!inspectionsResult.success) {
      throw new Error(`Erro na migração de inspeções: ${inspectionsResult.error}`);
    }
    
    console.log('=== MIGRAÇÃO COMPLETA FINALIZADA ===');
    console.log(`Templates atualizados: ${templatesResult.updated}`);
    console.log(`Inspeções atualizadas: ${inspectionsResult.updated}`);
    
    return {
      success: true,
      templates: templatesResult.updated,
      inspections: inspectionsResult.updated
    };
  } catch (error) {
    console.error('Erro na migração completa:', error);
    return { success: false, error: error.message };
  }
};

// Função para verificar status da migração
export const checkMigrationStatus = async () => {
  try {
    // Verificar templates sem código
    const templatesWithoutCode = await getDocs(query(
      collection(db, 'templates'),
      where('deleted_at', '==', null),
      where('cod', '==', null)
    ));
    
    // Verificar inspeções sem código  
    const inspectionsWithoutCode = await getDocs(query(
      collection(db, 'inspections'),
      where('deleted_at', '==', null),
      where('cod', '==', null)
    ));
    
    const templatesTotal = await getDocs(query(
      collection(db, 'templates'),
      where('deleted_at', '==', null)
    ));
    
    const inspectionsTotal = await getDocs(query(
      collection(db, 'inspections'),
      where('deleted_at', '==', null)
    ));
    
    return {
      templates: {
        total: templatesTotal.size,
        withoutCode: templatesWithoutCode.size,
        withCode: templatesTotal.size - templatesWithoutCode.size,
        migrated: templatesWithoutCode.size === 0
      },
      inspections: {
        total: inspectionsTotal.size,
        withoutCode: inspectionsWithoutCode.size,
        withCode: inspectionsTotal.size - inspectionsWithoutCode.size,
        migrated: inspectionsWithoutCode.size === 0
      }
    };
  } catch (error) {
    console.error('Erro ao verificar status da migração:', error);
    return { error: error.message };
  }
};