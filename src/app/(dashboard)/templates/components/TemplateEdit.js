// src/app/(dashboard)/templates/components/TemplateEdit.js
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RoomEditor from "./RoomEditor";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import { PencilRuler, Ruler, Wrench, Puzzle, Home, Building, Store } from "lucide-react";

const TEMPLATE_ICONS = [
  { value: 'pencil-ruler', label: 'Régua e Lápis', icon: PencilRuler },
  { value: 'ruler', label: 'Régua', icon: Ruler },
  { value: 'wrench', label: 'Chave', icon: Wrench },
  { value: 'puzzle', label: 'Quebra-cabeça', icon: Puzzle },
  { value: 'house', label: 'Casa', icon: Home },
  { value: 'building', label: 'Prédio', icon: Building },
  { value: 'store', label: 'Loja', icon: Store }
];

const TEMPLATE_COLORS = [
  { value: 'text-green-500', label: 'Verde', class: 'text-green-500 bg-green-50' },
  { value: 'text-red-500', label: 'Vermelho', class: 'text-red-500 bg-red-50' },
  { value: 'text-blue-500', label: 'Azul', class: 'text-blue-500 bg-blue-50' },
  { value: 'text-purple-500', label: 'Roxo', class: 'text-purple-500 bg-purple-50' },
  { value: 'text-orange-500', label: 'Laranja', class: 'text-orange-500 bg-orange-50' },
  { value: 'text-black', label: 'Preto', class: 'text-black bg-gray-50' },
  { value: 'text-gray-700', label: 'Cinza Escuro', class: 'text-gray-700 bg-gray-50' }
];

export default function TemplateEdit({ template, open, onClose }) {
  const [formData, setFormData] = useState(template);
  const [loading, setLoading] = useState(false);

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
        ...formData,
        template_price: parseFloat(formData.template_price) || 0,
        updated_at: new Date().toISOString()
      };

      await updateDoc(doc(db, "templates", template.id), dataToSave);
      toast({
        title: "Sucesso",
        description: "Template atualizado com sucesso"
      });
      onClose();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar template",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh]">
        <DialogHeader>
          <DialogTitle>Editar Template</DialogTitle>
          <DialogDescription>
            Modifique as informações do template
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
                    <SelectValue placeholder="Selecione um ícone">
                      {formData.icon && (
                        <div className="flex items-center gap-2">
                          {(() => {
                            const IconComponent = TEMPLATE_ICONS.find(i => i.value === formData.icon)?.icon;
                            return IconComponent && <IconComponent className="h-4 w-4" />;
                          })()}
                          {TEMPLATE_ICONS.find(i => i.value === formData.icon)?.label}
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_ICONS.map(icon => (
                      <SelectItem key={icon.value} value={icon.value}>
                        <div className="flex items-center gap-2">
                          <icon.icon className="h-4 w-4" />
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
                  value={formData.iconColor}
                  onValueChange={value => setFormData({...formData, iconColor: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma cor">
                      {formData.iconColor && (
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full ${formData.iconColor}`} />
                          {TEMPLATE_COLORS.find(c => c.value === formData.iconColor)?.label}
                        </div>
                      )}
                    </SelectValue>
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
              rooms={formData.rooms || []}
              onChange={rooms => setFormData({...formData, rooms})}
            />

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={onClose}>
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