// src/app/(dashboard)/templates/components/TemplateCreationDialog.js
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TEMPLATE_ICONS, TEMPLATE_COLORS } from "@/lib/constants";
import { codeService } from "@/services/code-service";
import TopicEditor from "./TopicEditor";

export default function TemplateCreationDialog({ open, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    template_price: "0",
    icon: "",
    icon_color: "",
    topics: []
  });
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const { toast } = useToast();

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const numericValue = value.replace(/[^0-9.]/g, '');
    const parsedValue = parseFloat(numericValue) || 0;
    setFormData(prev => ({
      ...prev,
      [name]: parsedValue.toString()
    }));
    setHasChanges(true);
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleClose = () => {
    if (hasChanges) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowConfirmClose(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Erro",
        description: "O título é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        title: formData.title,
        description: formData.description || null,
        template_price: parseFloat(formData.template_price) || 0,
        icon: formData.icon || null,
        icon_color: formData.icon_color || null,
        topics: formData.topics || []
      };

      const result = await codeService.createTemplateWithCode(dataToSave);

      if (result.success) {
        toast({
          title: "Sucesso",
          description: `Template criado com código ${result.code}`
        });
        setHasChanges(false);
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error("Erro ao criar template:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar template",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl">Criar Novo Template</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="h-[calc(100vh-200px)] flex flex-col">
            <ScrollArea className="flex-1 pb-4">
              <div className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm" htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={e => handleFieldChange('title', e.target.value)}
                      className="h-9 mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-sm" htmlFor="price">Preço</Label>
                    <Input
                      id="price"
                      type="number"
                      name="template_price"
                      min="0"
                      step="1.00"
                      value={formData.template_price}
                      onChange={handleNumberChange}
                      className="h-9 mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm" htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={e => handleFieldChange('description', e.target.value)}
                    className="h-9 mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm" htmlFor="icon">Ícone</Label>
                    <Select
                      value={formData.icon}
                      onValueChange={value => handleFieldChange('icon', value)}
                    >
                      <SelectTrigger className="h-9 mt-1">
                        <SelectValue placeholder="Selecione um ícone" />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_ICONS.map(icon => (
                          <SelectItem key={icon.value} value={icon.value}>
                            {icon.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm" htmlFor="icon-color">Cor do Ícone</Label>
                    <Select
                      value={formData.icon_color}
                      onValueChange={value => handleFieldChange('icon_color', value)}
                    >
                      <SelectTrigger className="h-9 mt-1">
                        <SelectValue placeholder="Selecione uma cor" />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_COLORS.map(color => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded-full ${color.class}`} />
                              {color.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <TopicEditor
                  topics={formData.topics}
                  onChange={topics => handleFieldChange('topics', topics)}
                />
              </div>
              <ScrollBar />
            </ScrollArea>
            
            <div className="flex justify-end gap-2 pt-4 border-t mt-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleClose} 
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                size="sm" 
                disabled={loading}
              >
                {loading ? "Criando..." : "Criar Template"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Close Dialog */}
      <Dialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Descartar alterações?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Você tem alterações não salvas. Tem certeza que deseja fechar?
          </p>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmClose(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmClose}
            >
              Descartar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}