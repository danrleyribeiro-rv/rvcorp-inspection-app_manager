// app/(dashboard)/templates/components/TemplateEditDialog.js
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RoomEditor from "./RoomEditor";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { TEMPLATE_ICONS, TEMPLATE_COLORS } from "@/lib/constants";

export default function TemplateEditDialog({ template, open, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    template_price: "0",
    icon: "",
    icon_color: "",
    rooms: []
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
        rooms: template.rooms || []
      });
    }
  }, [template]);

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    // Convert to number and back to string, removing invalid characters
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
        rooms: formData.rooms || [], // Ensure rooms is always an array
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
      <DialogContent className="max-w-4xl h-[90vh]">
        <DialogHeader>
          <DialogTitle>Editar Template</DialogTitle>
          <DialogDescription>
            Atualize o template de inspeção
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-full pr-4">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Preço</Label>
                <Input
                  type="number"
                  name="template_price"
                  min="0"
                  step="0.01"
                  value={formData.template_price}
                  onChange={handleNumberChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ícone</Label>
                <Select
                  value={formData.icon}
                  onValueChange={value => setFormData({...formData, icon: value})}
                >
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label>Cor do Ícone</Label>
                <Select
                  value={formData.icon_color}
                  onValueChange={value => setFormData({...formData, icon_color: value})}
                >
                  <SelectTrigger>
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

            <RoomEditor
              rooms={formData.rooms || []}  // Ensure rooms is always an array
              onChange={rooms => setFormData({...formData, rooms})}
            />

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}