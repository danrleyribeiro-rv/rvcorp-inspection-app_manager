// src/utils/dateUtils.js
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Formata qualquer tipo de data para o padrão brasileiro com fuso horário
 * @param {any} dateValue - Timestamp do Firestore, string ISO, ou Date
 * @returns {string|null} - Data formatada ou null se inválida
 */
export const formatDate = (dateValue) => {
  if (!dateValue) return null;
  
  try {
    let date;
    
    // Se for timestamp do Firestore
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    }
    // Se for string ISO
    else if (typeof dateValue === 'string') {
      date = parseISO(dateValue);
    }
    // Se já for um objeto Date
    else if (dateValue instanceof Date) {
      date = dateValue;
    }
    // Se for timestamp em milissegundos
    else if (typeof dateValue === 'number') {
      date = new Date(dateValue);
    }
    else {
      return null;
    }
    
    // Verifica se a data é válida
    if (!isValid(date)) {
      return null;
    }
    
    // Formata no padrão brasileiro com fuso horário
    return format(date, "d 'de' MMMM 'de' yyyy 'às' HH:mm:ss 'UTC'xxx", { 
      locale: ptBR 
    });
    
  } catch (error) {
    console.error("Erro ao formatar data:", error, dateValue);
    return null;
  }
};

/**
 * Formata data apenas como dia/mês/ano
 * @param {any} dateValue 
 * @returns {string|null}
 */
export const formatDateShort = (dateValue) => {
  if (!dateValue) return null;
  
  try {
    let date;
    
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    } else if (typeof dateValue === 'string') {
      date = parseISO(dateValue);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'number') {
      date = new Date(dateValue);
    } else {
      return null;
    }
    
    if (!isValid(date)) {
      return null;
    }
    
    return format(date, "dd/MM/yyyy", { locale: ptBR });
    
  } catch (error) {
    console.error("Erro ao formatar data curta:", error, dateValue);
    return null;
  }
};

/**
 * Formata data no padrão completo do português brasileiro
 * @param {any} dateValue 
 * @returns {string|null}
 */
export const formatDateLong = (dateValue) => {
  if (!dateValue) return null;
  
  try {
    let date;
    
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    } else if (typeof dateValue === 'string') {
      date = parseISO(dateValue);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'number') {
      date = new Date(dateValue);
    } else {
      return null;
    }
    
    if (!isValid(date)) {
      return null;
    }
    
    return format(date, "PPP", { locale: ptBR });
    
  } catch (error) {
    console.error("Erro ao formatar data longa:", error, dateValue);
    return null;
  }
};