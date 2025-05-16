// app/(dashboard)/templates/components/TemplateCreationDialog.js
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TopicEditor from "./TopicEditor";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

const TEMPLATE_ICONS = [
  { value: 'pencil-ruler', label: 'Régua e Lápis' },
  { value: 'ruler', label: 'Régua' },
  { value: 'wrench', label: 'Chave' },
  { value: 'puzzle', label: 'Quebra-cabeça' },
  { value: 'house', label: 'Casa' },
  { value: 'building', label: 'Prédio' },
  { value: 'store', label: 'Loja' }
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
  const { toast } = useToast();

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const numericValue = value.replace(/[^0-9.]/g, '');
    const parsedValue = parseFloat(numericValue) || 0; //Parse to float, 0 if null
    setFormData(prev => ({
      ...prev,
      [name]: parsedValue.toString() // Store as a string for the input.
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
        description: formData.description || null, // Handle optional fields
        template_price: parseFloat(formData.template_price) || null, // Convert to number
        icon: formData.icon || null,
        icon_color: formData.icon_color || null,
        topics: formData.topics || [], // Ensure 'topics' is an array
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        deleted_at: null
      };

      // Add document to Firestore
      await addDoc(collection(db, 'templates'), dataToSave);

      toast({
        title: "Sucesso",
        description: "Template criado com sucesso"
      });

      onSuccess();
      onClose();
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh]">
        <DialogHeader>
          <DialogTitle>Criar Novo Template</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar um novo template de inspeção
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

            <TopicEditor
              topics={formData.topics}
              onChange={topics => setFormData({...formData, topics})}
            />

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={loading}
              >
                {loading ? "Criando..." : "Criar Template"}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}