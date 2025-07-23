// src/components/inspection/FirestoreSetupAlert.jsx
"use client";

import { useState } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  Copy, 
  CheckCircle, 
  ExternalLink,
  Database 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FIRESTORE_RULES = `// Adicione estas regras ao seu firestore.rules:

// Coleção para dados de inspeções gerenciadas pelos managers
match /inspections_data/{inspectionId} {
  allow read, write: if request.auth != null 
    && exists(/databases/$(database)/documents/managers/$(request.auth.uid));
}

// Coleção para histórico de pulls
match /inspection_pull_history/{historyId} {
  allow read, write: if request.auth != null 
    && exists(/databases/$(database)/documents/managers/$(request.auth.uid));
}`;

export default function FirestoreSetupAlert({ 
  show, 
  onDismiss 
}) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  if (!show) return null;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(FIRESTORE_RULES);
      setCopied(true);
      toast({
        title: "Regras copiadas",
        description: "As regras do Firestore foram copiadas para a área de transferência."
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar as regras. Copie manualmente.",
        variant: "destructive"
      });
    }
  };

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-3">
          <div>
            <strong>Configuração necessária:</strong> O sistema de versionamento precisa de permissões no Firestore.
          </div>
          
          <div className="bg-muted/50 p-3 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Regras do Firestore
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="h-6 px-2"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
            <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
              {FIRESTORE_RULES}
            </pre>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <span>1. Copie as regras acima</span>
            <span>•</span>
            <span>2. Vá para o Firebase Console</span>
            <span>•</span>
            <span>3. Firestore Database → Regras</span>
            <span>•</span>
            <span>4. Cole e publique</span>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://console.firebase.google.com', '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-3 w-3" />
              Abrir Firebase Console
            </Button>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
              >
                Entendi, não mostrar novamente
              </Button>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}