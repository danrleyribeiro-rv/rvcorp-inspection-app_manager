// src/app/(dashboard)/templates/components/ItemEditor.js
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import ItemDetailEditor from "./ItemDetailEditor";

export default function ItemEditor({ items, onChange }) {
  const addItem = () => {
    onChange([...items, {
      name: "",
      description: "",
      details: [],
      media_requirements: {
        images: {
          min: 0,
          max: 3
        },
        videos: {
          min: 0,
          max: 1
        }
      }
    }]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    if (field.includes('.')) {
      const [main, sub, prop] = field.split('.');
      newItems[index][main] = newItems[index][main] || {};
      newItems[index][main][sub] = newItems[index][main][sub] || {};
      const numberValue = Number(value);
      newItems[index][main][sub][prop] = isNaN(numberValue) ? 0 : numberValue;
    } else {
      newItems[index][field] = value;
    }
    onChange(newItems);
  };

  const removeItem = (index) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label>Itens</Label>
        <Button variant="outline" onClick={addItem}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Item
        </Button>
      </div>

      {items.map((item, index) => (
        <Card key={index}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Label>Nome do Item</Label>
                <Input
                  value={item.name}
                  onChange={e => updateItem(index, "name", e.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={item.description}
                onChange={e => updateItem(index, "description", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <Label>Requisitos de Imagens</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-sm">Mínimo</Label>
                    <Input
                      type="number"
                      min="0"
                      value={item.media_requirements?.images?.min || 0}
                      onChange={e => updateItem(index, "media_requirements.images.min", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Máximo</Label>
                    <Input
                      type="number"
                      min="0"
                      value={item.media_requirements?.images?.max || 0}
                      onChange={e => updateItem(index, "media_requirements.images.max", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Requisitos de Vídeos</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-sm">Mínimo</Label>
                    <Input
                      type="number"
                      min="0"
                      value={item.media_requirements?.videos?.min || 0}
                      onChange={e => updateItem(index, "media_requirements.videos.min", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Máximo</Label>
                    <Input
                      type="number"
                      min="0"
                      value={item.media_requirements?.videos?.max || 0}
                      onChange={e => updateItem(index, "media_requirements.videos.max", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <ItemDetailEditor
              details={item.details || []}
              onChange={details => updateItem(index, "details", details)}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}