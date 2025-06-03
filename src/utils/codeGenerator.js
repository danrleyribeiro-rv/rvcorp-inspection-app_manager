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

// Gera código para inspeção: INSP250603-001
export const generateInspectionCode = async (date = new Date()) => {
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
    
    if (snapshot.empty) {
      return `${baseCode}-001`;
    }
    
    const lastInspection = snapshot.docs[0].data();
    const lastCode = lastInspection.cod || `${baseCode}-000`;
    const lastSequence = parseInt(lastCode.split('-')[1]);
    const nextSequence = lastSequence + 1;
    
    return `${baseCode}-${nextSequence.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating inspection code:', error);
    const dateCode = formatDateCode(date);
    return `INSP${dateCode}-001`;
  }
};

// Gera código para relatório: RLT01-INSP250603-001.TP0001
export const generateReportCode = async (inspectionCode, templateCode, reportVersion = 1) => {
  try {
    const reportPrefix = `RLT${reportVersion.toString().padStart(2, '0')}`;
    return `${reportPrefix}-${inspectionCode}.${templateCode}`;
  } catch (error) {
    console.error('Error generating report code:', error);
    return `RLT01-${inspectionCode}.${templateCode}`;
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
  
  if (/^INSP\d{6}-\d{3}$/.test(code)) {
    const [base, sequence] = code.split('-');
    const dateStr = base.replace('INSP', '');
    
    return {
      type: 'inspection',
      date: `20${dateStr.slice(0, 2)}-${dateStr.slice(2, 4)}-${dateStr.slice(4, 6)}`,
      sequence: parseInt(sequence)
    };
  }
  
  return null;
};