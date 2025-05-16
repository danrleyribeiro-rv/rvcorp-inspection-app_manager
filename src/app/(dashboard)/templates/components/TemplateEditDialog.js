// src/app/(dashboard)/templates/components/TemplateEditDialog.js
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { TEMPLATE_ICONS, TEMPLATE_COLORS } from "@/lib/constants";
import TopicEditor from "./TopicEditor";

export default function TemplateEditDialog({ template, open, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    template_price: "0",
    icon: "",
    icon_color: "",
    topics: []
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Initialize form data when template prop changes
  useEffect(() => {
    if (template) {
      setFormData({
        title: template.title || "",
        description: template.description || "",
        template_price: template.template_price?.toString() || "0",
        icon: template.icon || "",
        icon_color: template.icon_color || "",
        topics: template.topics?.map(topic => ({
          name: topic.name || "",
          description: topic.description || "",
          items: topic.items?.map(item => ({
            name: item.name || "",
            description: item.description || "",
            details: item.details || []
          })) || []
        })) || []
      });
    }
  }, [template]);

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const numericValue = value.replace(/[^0-9.]/g, '');
    const parsedValue = parseFloat(numericValue) || 0;
    setFormData(prev => ({
      ...prev,
      [name]: parsedValue.toString()
    }));
  };

  const handleSubmit = async () => {
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
        topics: formData.topics || [],
        updated_at: serverTimestamp()
      };

      // Update document in Firestore
      const templateRef = doc(db, 'templates', template.id);
      await updateDoc(templateRef, dataToSave);

      toast({
        title: "Sucesso",
        description: "Template atualizado com sucesso"
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao atualizar template:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar template",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl">Editar Template</DialogTitle>
        </DialogHeader>
        <div className="h-[calc(100vh-200px)]">
          <ScrollArea className="h-full pb-4">
            <div className="space-y-4 pr-4">
              {/* Cabeçalho mais compacto */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm" htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm" htmlFor="price">Preço</Label>
                  <Input
                    id="price"
                    type="number"
                    name="template_price"
                    min="0"
                    step="0.01"
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
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="h-9 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm" htmlFor="icon">Ícone</Label>
                  <Select
                    id="icon"
                    value={formData.icon}
                    onValueChange={value => setFormData({...formData, icon: value})}
                  >
                    <SelectTrigger className="h-9 mt-1">
                      <SelectValue placeholder="Selecione um ícone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_ICONS.map(icon => (
                        <SelectItem key={icon.value} value={icon.value}>
                          <div className="flex items-center gap-2">
                            {icon.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm" htmlFor="icon-color">Cor do Ícone</Label>
                  <Select
                    id="icon-color"
                    value={formData.icon_color}
                    onValueChange={value => setFormData({...formData, icon_color: value})}
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
                topics={formData.topics || []}
                onChange={topics => setFormData({...formData, topics})}
              />
            </div>
            <ScrollBar />
          </ScrollArea>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t mt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}