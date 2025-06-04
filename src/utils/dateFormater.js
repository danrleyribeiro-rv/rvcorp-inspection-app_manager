// src/utils/dateFormatter.js
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

export const formatDateSafe = (dateValue) => {
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
    
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    
  } catch (error) {
    console.error("Erro ao formatar data:", error, dateValue);
    return null;
  }
};

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