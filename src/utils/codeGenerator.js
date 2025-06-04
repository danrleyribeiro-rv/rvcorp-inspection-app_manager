// src/utils/codeGenerator.js
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

// Formata data no padrão AAMMDD
const formatDateCode = (date = new Date()) => {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
};

// Gera código para template: TP0001
export const generateTemplateCode = async () => {
  try {
    const templatesQuery = query(
      collection(db, 'templates'),
      where('deleted_at', '==', null),
      orderBy('cod', 'desc'),
      limit(1)
    );
    
    const snapshot = await getDocs(templatesQuery);
    
    if (snapshot.empty) {
      return 'TP0001';
    }
    
    const lastTemplate = snapshot.docs[0].data();
    const lastCode = lastTemplate.cod || 'TP0000';
    const lastNumber = parseInt(lastCode.replace('TP', ''));
    const nextNumber = lastNumber + 1;
    
    return `TP${nextNumber.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating template code:', error);
    return 'TP0001';
  }
};

// Gera código para inspeção: INSP250603-001.TP0001
export const generateInspectionCode = async (date = new Date(), templateCode = null) => {
  try {
    const dateCode = formatDateCode(date);
    const baseCode = `INSP${dateCode}`;
    
    // Busca inspeções do mesmo dia
    const inspectionsQuery = query(
      collection(db, 'inspections'),
      where('deleted_at', '==', null),
      where('cod', '>=', `${baseCode}-000`),
      where('cod', '<=', `${baseCode}-999`),
      orderBy('cod', 'desc'),
      limit(1)
    );
    
    const snapshot = await getDocs(inspectionsQuery);
    
    let sequenceNumber = 1;
    if (!snapshot.empty) {
      const lastInspection = snapshot.docs[0].data();
      const lastCode = lastInspection.cod || `${baseCode}-000`;
      // Extrai apenas a parte do sequencial (antes do ponto se houver)
      const codeParts = lastCode.split('.');
      const sequencePart = codeParts[0].split('-')[1];
      sequenceNumber = parseInt(sequencePart) + 1;
    }
    
    const inspectionCode = `${baseCode}-${sequenceNumber.toString().padStart(3, '0')}`;
    
    // Se tem código do template, adiciona ao final
    if (templateCode) {
      return `${inspectionCode}.${templateCode}`;
    }
    
    return inspectionCode;
  } catch (error) {
    console.error('Error generating inspection code:', error);
    const dateCode = formatDateCode(date);
    const fallbackCode = `INSP${dateCode}-001`;
    return templateCode ? `${fallbackCode}.${templateCode}` : fallbackCode;
  }
};

// Gera código para relatório: RLT01-INSP250603-001.TP0001
export const generateReportCode = async (inspectionCode, reportVersion = 1) => {
  try {
    const reportPrefix = `RLT${reportVersion.toString().padStart(2, '0')}`;
    return `${reportPrefix}-${inspectionCode}`;
  } catch (error) {
    console.error('Error generating report code:', error);
    return `RLT01-${inspectionCode}`;
  }
};

// Extrai informações do código
export const parseCode = (code) => {
  if (/^TP\d{4}$/.test(code)) {
    return {
      type: 'template',
      number: parseInt(code.replace('TP', ''))
    };
  }
  
  if (/^INSP\d{6}-\d{3}(\.TP\d{4})?$/.test(code)) {
    const parts = code.split('.');
    const basePart = parts[0]; // INSP250603-001
    const templatePart = parts[1]; // TP0001 (se existir)
    
    const [base, sequence] = basePart.split('-');
    const dateStr = base.replace('INSP', '');
    
    return {
      type: 'inspection',
      date: `20${dateStr.slice(0, 2)}-${dateStr.slice(2, 4)}-${dateStr.slice(4, 6)}`,
      sequence: parseInt(sequence),
      template: templatePart || null
    };
  }
  
  return null;
};

// Valida formato do código
export const validateCode = (code, type) => {
  if (!code || typeof code !== 'string') return false;
  
  switch (type) {
    case 'template':
      return /^TP\d{4}$/.test(code);
    case 'inspection':
      return /^INSP\d{6}-\d{3}(\.TP\d{4})?$/.test(code);
    case 'report':
      return /^RLT\d{2}-INSP\d{6}-\d{3}(\.TP\d{4})?$/.test(code);
    default:
      return false;
  }
};

// Verifica se código já existe
export const codeExists = async (code, collectionName) => {
  try {
    const q = query(
      collection(db, collectionName),
      where('cod', '==', code),
      where('deleted_at', '==', null),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking code existence:', error);
    return false;
  }
};

// Gera próximo código disponível
export const getNextAvailableCode = async (type, options = {}) => {
  const { date, templateCode, reportVersion } = options;
  
  switch (type) {
    case 'template':
      return await generateTemplateCode();
    case 'inspection':
      return await generateInspectionCode(date, templateCode);
    case 'report':
      return await generateReportCode(options.inspectionCode, reportVersion);
    default:
      throw new Error(`Unknown code type: ${type}`);
  }
};