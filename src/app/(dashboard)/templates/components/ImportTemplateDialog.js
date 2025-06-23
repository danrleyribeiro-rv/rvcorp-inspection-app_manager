// src/app/(dashboard)/templates/components/ImportTemplateDialog.js
"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { FileJson, Upload, Check } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { generateTemplateCode, codeExists } from "@/utils/codeGenerator";

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
        } else if (file.name.endsWith(".csv")) {
          // Parse CSV
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (!results.data || results.data.length === 0) {
                toast({
                  title: "CSV vazio",
                  description: "O arquivo CSV não contém dados.",
                  variant: "destructive",
                });
                return;
              }
              // Agrupar por title para montar estrutura de template
              const grouped = {};
              results.data.forEach(row => {
                if (!grouped[row.title]) grouped[row.title] = {
                  title: row.title,
                  description: row.description || '',
                  template_price: row.template_price ? Number(row.template_price) : 0,
                  icon: row.icon || null,
                  icon_color: row.icon_color || null,
                  topics: []
                };
                let template = grouped[row.title];
                let topic = template.topics.find(t => t.name === row.topic_name);
                if (!topic) {
                  topic = { name: row.topic_name, description: row.topic_description, items: [] };
                  template.topics.push(topic);
                }
                let item = topic.items.find(i => i.name === row.item_name);
                if (!item) {
                  item = { name: row.item_name, description: row.item_description, details: [] };
                  topic.items.push(item);
                }
                item.details.push({
                  name: row.detail_name,
                  type: row.detail_type,
                  required: row.detail_required === 'true',
                  options: row.detail_options ? row.detail_options.split('|') : []
                });
              });
              // Pega o primeiro template agrupado
              const templateData = Object.values(grouped)[0];
              setPreview(templateData);
            },
            error: (err) => {
              toast({
                title: "Erro ao processar CSV",
                description: err.message,
                variant: "destructive",
              });
            }
          });
        } else if (file.name.endsWith(".xlsx")) {
          // Parse XLSX
          const workbook = XLSX.read(text, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const results = XLSX.utils.sheet_to_json(sheet, { defval: "" });
          if (!results || results.length === 0) {
            toast({
              title: "XLSX vazio",
              description: "O arquivo XLSX não contém dados.",
              variant: "destructive",
            });
            return;
          }
          // Agrupar por title para montar estrutura de template (igual ao CSV)
          const grouped = {};
          results.forEach(row => {
            if (!grouped[row.title]) grouped[row.title] = {
              title: row.title,
              description: row.description || '',
              template_price: row.template_price ? Number(row.template_price) : 0,
              icon: row.icon || null,
              icon_color: row.icon_color || null,
              topics: []
            };
            let template = grouped[row.title];
            let topic = template.topics.find(t => t.name === row.topic_name);
            if (!topic) {
              topic = { name: row.topic_name, description: row.topic_description, items: [] };
              template.topics.push(topic);
            }
            let item = topic.items.find(i => i.name === row.item_name);
            if (!item) {
              item = { name: row.item_name, description: row.item_description, details: [] };
              topic.items.push(item);
            }
            item.details.push({
              name: row.detail_name,
              type: row.detail_type,
              required: row.detail_required === 'true',
              options: row.detail_options ? row.detail_options.split('|') : []
            });
          });
          const templateData = Object.values(grouped)[0];
          setPreview(templateData);
        } else {
          toast({
            title: "Formato não suportado",
            description: "Apenas arquivos JSON ou CSV são suportados",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Erro ao processar arquivo",
          description: error.message || "Erro ao processar arquivo. Verifique o formato.",
          variant: "destructive",
        });
      }
    };
    if (file.name.endsWith(".csv")) {
      reader.readAsText(file, "utf-8");
    } else if (file.name.endsWith(".xlsx")) {
      const fr = new FileReader();
      fr.onload = (evt) => {
        const data = evt.target.result;
        // XLSX precisa de binary string
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const results = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        if (!results || results.length === 0) {
          toast({
            title: "XLSX vazio",
            description: "O arquivo XLSX não contém dados.",
            variant: "destructive",
          });
          return;
        }
        // Agrupar por title para montar estrutura de template (igual ao CSV)
        const grouped = {};
        results.forEach(row => {
          if (!grouped[row.title]) grouped[row.title] = {
            title: row.title,
            description: row.description || '',
            template_price: row.template_price ? Number(row.template_price) : 0,
            icon: row.icon || null,
            icon_color: row.icon_color || null,
            topics: []
          };
          let template = grouped[row.title];
          let topic = template.topics.find(t => t.name === row.topic_name);
          if (!topic) {
            topic = { name: row.topic_name, description: row.topic_description, items: [] };
            template.topics.push(topic);
          }
          let item = topic.items.find(i => i.name === row.item_name);
          if (!item) {
            item = { name: row.item_name, description: row.item_description, details: [] };
            topic.items.push(item);
          }
          item.details.push({
            name: row.detail_name,
            type: row.detail_type,
            required: row.detail_required === 'true',
            options: row.detail_options ? row.detail_options.split('|') : []
          });
        });
        const templateData = Object.values(grouped)[0];
        setPreview(templateData);
      };
      fr.readAsBinaryString(file);
      setFile(file);
      return;
    } else {
      reader.readAsText(file);
    }
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
      // Verifica duplicidade por title e cod
      let baseTitle = preview.title;
      let newTitle = baseTitle;
      let cod = await generateTemplateCode();
      let count = 1;
      // Garante título e código únicos
      while (true) {
        const q = query(collection(db, 'templates'), where('deleted_at', '==', null), where('title', '==', newTitle));
        const snapshot = await getDocs(q);
        if (snapshot.empty) break;
        count++;
        newTitle = `${baseTitle} ${count}`;
      }
      // Garante código único
      while (await codeExists(cod, 'templates')) {
        const num = parseInt(cod.replace('TP', '')) + 1;
        cod = `TP${num.toString().padStart(4, '0')}`;
      }
      const dataToSave = {
        ...preview,
        title: newTitle,
        cod,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        deleted_at: null
      };
      await addDoc(collection(db, 'templates'), dataToSave);
      toast({
        title: "Sucesso",
        description: `Template '${newTitle}' importado com sucesso com código ${cod}`
      });
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: "Erro ao importar template",
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
            accept=".json,.csv,.xlsx"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />
          <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm mb-1">
            Arraste um arquivo JSON, CSV ou XLSX ou clique para selecionar
          </p>
          <div className="flex justify-center items-center gap-2 mt-2">
            <FileJson className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">JSON/CSV/XLSX</span>
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