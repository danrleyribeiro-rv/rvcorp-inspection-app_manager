// app/(dashboard)/templates/components/ExportTemplateDialog.js
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import JSZip from "jszip";

export default function ExportTemplateDialog({ open, onClose, templates }) {
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const toggleTemplate = (id) => {
    if (selectedTemplates.includes(id)) {
      setSelectedTemplates(selectedTemplates.filter(t => t !== id));
    } else {
      setSelectedTemplates([...selectedTemplates, id]);
    }
  };

  const selectAll = () => {
    if (selectedTemplates.length === templates.length) {
      setSelectedTemplates([]);
    } else {
      setSelectedTemplates(templates.map(t => t.id));
    }
  };

  const handleExport = async (type = "json") => {
    if (selectedTemplates.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um template para exportar",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const templatesData = templates
        .filter(t => selectedTemplates.includes(t.id))
        .map(({ id, created_at, updated_at, deleted_at, ...rest }) => ({
          ...rest,
          original_id: id
        }));
      if (selectedTemplates.length > 1) {
        // Exporta múltiplos arquivos em um ZIP
        const zip = new JSZip();
        if (type === "csv" || type === "xlsx") {
          // Um arquivo por template
          templatesData.forEach(template => {
            const rows = [];
            template.topics?.forEach(topic => {
              topic.items?.forEach(item => {
                item.details?.forEach(detail => {
                  rows.push({
                    title: template.title,
                    description: template.description,
                    template_price: template.template_price,
                    icon: template.icon,
                    icon_color: template.icon_color,
                    topic_name: topic.name,
                    topic_description: topic.description,
                    item_name: item.name,
                    item_description: item.description,
                    detail_name: detail.name,
                    detail_type: detail.type,
                    detail_required: detail.required,
                    detail_options: detail.options?.join("|") || ""
                  });
                });
              });
            });
            if (type === "csv") {
              const csv = Papa.unparse(rows);
              zip.file(`template_${template.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`, csv);
            } else {
              const ws = XLSX.utils.json_to_sheet(rows);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Templates");
              const xlsxData = XLSX.write(wb, { type: "array", bookType: "xlsx" });
              zip.file(`template_${template.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`, xlsxData);
            }
          });
        } else {
          // Um arquivo JSON por template
          templatesData.forEach(template => {
            const dataStr = JSON.stringify(template, null, 2);
            zip.file(`${template.title.replace(/\s+/g, '_')}_${template.cod || ''}.json`, dataStr);
          });
        }
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `templates_export_${new Date().toISOString().slice(0, 10)}.zip`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Exportação individual para CSV/XLSX
        if (type === "csv") {
          const template = templatesData[0];
          const rows = [];
          template.topics?.forEach(topic => {
            topic.items?.forEach(item => {
              item.details?.forEach(detail => {
                rows.push({
                  title: template.title,
                  description: template.description,
                  template_price: template.template_price,
                  icon: template.icon,
                  icon_color: template.icon_color,
                  topic_name: topic.name,
                  topic_description: topic.description,
                  item_name: item.name,
                  item_description: item.description,
                  detail_name: detail.name,
                  detail_type: detail.type,
                  detail_required: detail.required,
                  detail_options: detail.options?.join("|") || ""
                });
              });
            });
          });
          const csv = Papa.unparse(rows);
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `template_${template.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } else if (type === "xlsx") {
          const template = templatesData[0];
          const rows = [];
          template.topics?.forEach(topic => {
            topic.items?.forEach(item => {
              item.details?.forEach(detail => {
                rows.push({
                  title: template.title,
                  description: template.description,
                  template_price: template.template_price,
                  icon: template.icon,
                  icon_color: template.icon_color,
                  topic_name: topic.name,
                  topic_description: topic.description,
                  item_name: item.name,
                  item_description: item.description,
                  detail_name: detail.name,
                  detail_type: detail.type,
                  detail_required: detail.required,
                  detail_options: detail.options?.join("|") || ""
                });
              });
            });
          });
          const ws = XLSX.utils.json_to_sheet(rows);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Templates");
          XLSX.writeFile(wb, `template_${template.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } else {
          // Exporta para JSON individual
          const dataStr = JSON.stringify(templatesData[0], null, 2);
          const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
          const exportFileName = `template_${templatesData[0].title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
          const linkElement = document.createElement('a');
          linkElement.setAttribute('href', dataUri);
          linkElement.setAttribute('download', exportFileName);
          linkElement.click();
        }
      }
      toast({
        title: "Sucesso",
        description: `${selectedTemplates.length} template(s) exportado(s) com sucesso`
      });
      onClose();
    } catch (error) {
      toast({
        title: "Erro ao exportar templates",
        description: "Erro ao exportar templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Exportar Templates</DialogTitle>
          <DialogDescription>
            Selecione os templates que deseja exportar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Templates Disponíveis</Label>
            <Button 
              variant="outline" 
              size="sm"
              onClick={selectAll}
            >
              {selectedTemplates.length === templates.length ? "Desmarcar Todos" : "Selecionar Todos"}
            </Button>
          </div>

          <ScrollArea className="h-64 border rounded-md p-2">
            {templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum template disponível
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map(template => (
                  <div 
                    key={template.id}
                    className={`p-3 rounded-md cursor-pointer flex justify-between items-center ${
                      selectedTemplates.includes(template.id) ? "bg-primary/10" : "hover:bg-accent"
                    }`}
                    onClick={() => toggleTemplate(template.id)}
                  >
                    <div>
                      <p className="font-medium">{template.title}</p>
                      <p className="text-sm text-muted-foreground">{template.description || "Sem descrição"}</p>
                    </div>
                    {selectedTemplates.includes(template.id) && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end pt-4 gap-2">
            <Button
              onClick={() => handleExport("json")}
              disabled={loading || selectedTemplates.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              {loading ? "Exportando..." : "Exportar JSON"}
            </Button>
            <Button
              onClick={() => handleExport("csv")}
              disabled={loading || selectedTemplates.length === 0}
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button
              onClick={() => handleExport("xlsx")}
              disabled={loading || selectedTemplates.length === 0}
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              XLSX
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}