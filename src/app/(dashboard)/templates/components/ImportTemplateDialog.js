// app/(dashboard)/templates/components/ImportTemplateDialog.js
"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { FileJson, FileSpreadsheet, Upload } from "lucide-react";

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
      const text = e.target.result;
      try {
        if (file.name.endsWith(".json")) {
          const data = JSON.parse(text);
           // Validate that the imported JSON has the expected structure.
          if (!data.title) {
            throw new Error("Imported JSON must have a 'title' property.");
          }
          // If 'rooms' exists, ensure that it's an array.
          if (data.rooms && !Array.isArray(data.rooms)) {
                throw new Error("The 'rooms' property must be an array.");
          }

          setPreview(data);
        } else {
          // CSV is *not* supported, show error immediately.
          toast({
            title: "Formato não suportado",
            description:
              "Apenas arquivos JSON são suportados para importação de templates",
            variant: "destructive",
          });
          return;  // Important: Stop processing here.
        }
      } catch (error) {
        toast({
          title: "Erro",
          description:
            error.message || "Erro ao processar arquivo. Verifique se é um JSON válido.",
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
        title: preview.title,
        description: preview.description || null, // Handle optional fields
        template_price: parseFloat(preview.template_price) || null,
        icon: preview.icon || null,
        icon_color: preview.icon_color || null,
        rooms: preview.rooms || [], // Ensure 'rooms' is an array (even if empty)
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("templates").insert([dataToSave]); // Insert as an array

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Template importado com sucesso",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error importing template:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao importar template",
        variant: "destructive",
      });
    } finally {
       setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Template</DialogTitle>
          <DialogDescription>
            Importe um template a partir de um arquivo JSON
          </DialogDescription>
        </DialogHeader>

        <div
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer"
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
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Arraste um arquivo ou clique para selecionar
          </p>
          <div className="flex justify-center gap-4">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4" />
              <span className="text-sm">JSON</span>
            </div>
          </div>
        </div>

        {file && (
          <div className="space-y-4">
            <p className="text-sm">Arquivo selecionado: {file.name}</p>
            {preview && (
              <>
                <div className="max-h-64 overflow-auto p-4 bg-muted rounded-lg">
                  <pre className="text-xs">
                    {JSON.stringify(preview, null, 2)}
                  </pre>
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