// src/app/(dashboard)/templates/components/ImportTemplateDialog.js
"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import Papa from "papaparse";
import { FileJson, FileSpreadsheet, Upload } from "lucide-react";

export default function ImportTemplateDialog({ open, onClose }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      try {
        if (file.name.endsWith(".json")) {
          const data = JSON.parse(text);
          setPreview(data);
        } else if (file.name.endsWith(".csv")) {
          Papa.parse(text, {
            header: true,
            complete: (results) => setPreview(results.data)
          });
        }
      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao processar arquivo",
          variant: "destructive"
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
      await addDoc(collection(db, "templates"), {
        ...preview,
        created_at: new Date().toISOString()
      });
      toast({
        title: "Sucesso",
        description: "Template importado com sucesso"
      });
      onClose();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao importar template",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Importar Template</DialogTitle>
        <DialogDescription>
          Importe um template a partir de um arquivo JSON ou CSV
        </DialogDescription>
      </DialogHeader>

        <div
          className="border-2 border-dashed rounded-lg p-8 text-center"
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept=".json,.csv"
            onChange={e => handleFileSelect(e.target.files?.[0])}
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
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              <span className="text-sm">CSV</span>
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
                  <Button
                    onClick={handleImport}
                    disabled={loading}
                  >
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