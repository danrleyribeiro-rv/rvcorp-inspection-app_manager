
// app/(dashboard)/templates/components/ExportTemplateDialog.js
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

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

  const handleExport = () => {
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
      // Filter templates to export
      const templatesData = templates.filter(t => selectedTemplates.includes(t.id));
      
      // Create JSON data
      const dataStr = JSON.stringify(templatesData, null, 2);
      
      // Create download link
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
      const exportFileName = `templates_export_${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileName);
      linkElement.click();
      
      toast({
        title: "Sucesso",
        description: `${selectedTemplates.length} template(s) exportado(s) com sucesso`
      });
      
      onClose();
    } catch (error) {
      console.error("Error exporting templates:", error);
      toast({
        title: "Erro",
        description: "Erro ao exportar templates",
        variant: "destructive"
      });
    }
    setLoading(false);
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

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleExport}
              disabled={loading || selectedTemplates.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              {loading ? "Exportando..." : "Exportar Templates"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}