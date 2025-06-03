// src/hooks/use-code-generator.js
"use client";

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  generateTemplateCode, 
  generateInspectionCode, 
  generateReportCode,
  getNextAvailableCode,
  codeExists,
  validateCode 
} from '@/utils/codeGenerator';

export function useCodeGenerator() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateCode = async (type, options = {}) => {
    setLoading(true);
    try {
      const code = await getNextAvailableCode(type, options);
      return { success: true, code };
    } catch (error) {
      console.error(`Error generating ${type} code:`, error);
      toast({
        title: "Erro ao gerar código",
        description: error.message,
        variant: "destructive"
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const validateCodeFormat = (code, type) => {
    return validateCode(code, type);
  };

  const checkCodeAvailability = async (code, collectionName) => {
    setLoading(true);
    try {
      const exists = await codeExists(code, collectionName);
      return { success: true, exists };
    } catch (error) {
      console.error('Error checking code availability:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    generateCode,
    validateCodeFormat,
    checkCodeAvailability,
    loading
  };
}

// src/services/code-service.js
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateTemplateCode, generateInspectionCode } from '@/utils/codeGenerator';

export const codeService = {
  // Cria template com código automático
  async createTemplateWithCode(templateData) {
    try {
      const code = await generateTemplateCode();
      
      const dataToSave = {
        ...templateData,
        cod: code,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        deleted_at: null
      };
      
      const docRef = await addDoc(collection(db, 'templates'), dataToSave);
      
      return {
        success: true,
        id: docRef.id,
        code,
        data: dataToSave
      };
    } catch (error) {
      console.error('Error creating template with code:', error);
      throw error;
    }
  },

  // Cria inspeção com código automático
  async createInspectionWithCode(inspectionData) {
    try {
      const code = await generateInspectionCode();
      
      const dataToSave = {
        ...inspectionData,
        cod: code,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        deleted_at: null
      };
      
      const docRef = await addDoc(collection(db, 'inspections'), dataToSave);
      
      return {
        success: true,
        id: docRef.id,
        code,
        data: dataToSave
      };
    } catch (error) {
      console.error('Error creating inspection with code:', error);
      throw error;
    }
  },

  // Atualiza código manualmente (se necessário)
  async updateCode(collectionName, documentId, newCode) {
    try {
      const docRef = doc(db, collectionName, documentId);
      
      await updateDoc(docRef, {
        cod: newCode,
        updated_at: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating code:', error);
      throw error;
    }
  },

  // Busca documentos por código
  async findByCode(collectionName, code) {
    try {
      const q = query(
        collection(db, collectionName),
        where('cod', '==', code),
        where('deleted_at', '==', null)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return { success: true, data: null };
      }
      
      const doc = snapshot.docs[0];
      return {
        success: true,
        data: {
          id: doc.id,
          ...doc.data()
        }
      };
    } catch (error) {
      console.error('Error finding by code:', error);
      throw error;
    }
  }
};

// src/components/ui/code-display.jsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function CodeDisplay({ code, type, className = "" }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Código copiado",
        description: `${code} foi copiado para a área de transferência`,
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o código",
        variant: "destructive"
      });
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      template: "bg-blue-100 text-blue-800",
      inspection: "bg-green-100 text-green-800", 
      report: "bg-purple-100 text-purple-800"
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge className={getTypeColor(type)}>
        {code}
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={copyToClipboard}
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}

// src/components/ui/code-input.jsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useCodeGenerator } from "@/hooks/use-code-generator";
import { validateCode } from "@/utils/codeGenerator";

export function CodeInput({ 
  value, 
  onChange, 
  type, 
  collectionName,
  autoGenerate = true,
  disabled = false,
  required = true,
  label = "Código"
}) {
  const [isValid, setIsValid] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const { generateCode, checkCodeAvailability, loading } = useCodeGenerator();

  useEffect(() => {
    if (value) {
      const valid = validateCode(value, type);
      setIsValid(valid);
    }
  }, [value, type]);

  const handleGenerate = async () => {
    const result = await generateCode(type);
    if (result.success) {
      onChange(result.code);
    }
  };

  const handleCheckAvailability = async () => {
    if (!value || !isValid) return;
    
    setIsChecking(true);
    const result = await checkCodeAvailability(value, collectionName);
    setIsChecking(false);
    
    if (result.success && result.exists) {
      setIsValid(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="code">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            id="code"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={handleCheckAvailability}
            disabled={disabled}
            className={`pr-8 ${!isValid ? 'border-red-500' : ''}`}
            placeholder={`Ex: ${type === 'template' ? 'TP0001' : 'INSP250603-001'}`}
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            {isChecking ? (
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : isValid ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <X className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>
        {autoGenerate && (
          <Button
            type="button"
            variant="outline"
            onClick={handleGenerate}
            disabled={loading || disabled}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
      {!isValid && value && (
        <p className="text-sm text-red-500">
          Código inválido ou já existe
        </p>
      )}
    </div>
  );
}