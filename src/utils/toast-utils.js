// src/utils/toast-utils.js
import { toast } from "@/hooks/use-toast";

export const showErrorToast = (title, description) => {
  toast({
    variant: "destructive",
    title: title || "Erro",
    description: description || "Ocorreu um erro inesperado",
  });
};

export const showSuccessToast = (title, description) => {
  toast({
    title: title || "Sucesso", 
    description: description,
  });
};

export const showInfoToast = (title, description) => {
  toast({
    title: title || "Informação",
    description: description,
  });
};