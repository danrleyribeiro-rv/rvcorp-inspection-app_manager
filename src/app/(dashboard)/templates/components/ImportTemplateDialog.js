// src/app/(dashboard)/templates/components/ImportTemplateDialog.js
"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { FileJson, Upload, Check } from "lucide-react";

export default function ImportTemplateDialog({ open, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleFileSelect = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        if (file.name.endsWith(".json")) {
          const data = JSON.parse(text);
          
          // Se é um array (múltiplos templates), processa apenas o primeiro
          const templateData = Array.isArray(data) ? data[0] : data;
          
          // Validação básica do JSON
          if (!templateData || !templateData.title) {
            throw new Error("O template deve ter uma propriedade 'title'");
          }
          
          // Garantir que todos os campos obrigatórios estejam presentes
          const validatedData = {
            title: templateData.title,
            description: templateData.description || "",
            template_price: typeof templateData.template_price === 'number' ? templateData.template_price : 0,
            icon: templateData.icon || null,
            icon_color: templateData.icon_color || templateData.iconColor || null,
            topics: Array.isArray(templateData.topics) ? templateData.topics.map(topic => ({
              name: topic.name || "",
              description: topic.description || "",
              items: Array.isArray(topic.items) ? topic.items.map(item => ({
                name: item.name || "",
                description: item.description || "",
                details: Array.isArray(item.details) ? item.details : []
              })) : []
            })) : []
          };
          
          setPreview(validatedData);
          
          // Se é um array com múltiplos templates, avisa o usuário
          if (Array.isArray(data) && data.length > 1) {
            toast({
              title: "Múltiplos templates detectados",
              description: `Arquivo contém ${data.length} templates. Apenas o primeiro será importado.`,
              variant: "default"
            });
          }
        } else {
          toast({
            title: "Formato não suportado",
            description: "Apenas arquivos JSON são suportados",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Erro ao processar arquivo:", error);
        toast({
          title: "Erro",
          description: error.message || "Erro ao processar arquivo JSON. Verifique o formato.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    setFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer?.files[0];
    handleFileSelect(droppedFile);
  };

  const handleImport = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      const dataToSave = {
        ...preview,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        deleted_at: null
      };

      // Add document to Firestore
      await addDoc(collection(db, 'templates'), dataToSave);

      toast({
        title: "Sucesso",
        description: "Template importado com sucesso"
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao importar template:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao importar template",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl">Importar Template</DialogTitle>
        </DialogHeader>

        <div
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept=".json"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />
          <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm mb-1">
            Arraste um arquivo JSON ou clique para selecionar
          </p>
          <div className="flex justify-center items-center gap-2 mt-2">
            <FileJson className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">JSON</span>
          </div>
        </div>

        {file && (
          <div className="space-y-3 mt-3">
            <p className="text-sm">
              <span className="font-medium">Arquivo:</span> {file.name}
            </p>
            {preview && (
              <>
                <div className="p-3 border rounded-md bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <p className="font-medium text-sm">{preview.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{preview.description}</p>
                  <p className="text-xs"><span className="font-medium">Tópicos:</span> {preview.topics?.length || 0}</p>
                  <p className="text-xs">
                    <span className="font-medium">Itens:</span> {
                      preview.topics?.reduce((total, topic) => total + (topic.items?.length || 0), 0) || 0
                    }
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleImport} disabled={loading}>
                    {loading ? "Importando..." : "Importar Template"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}