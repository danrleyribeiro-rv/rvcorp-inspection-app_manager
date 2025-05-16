// src/app/(dashboard)/templates/components/ItemEditor.js
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Copy, ChevronDown, ChevronUp } from "lucide-react";
import ItemDetailEditor from "./ItemDetailEditor";

export default function ItemEditor({ items = [], onChange }) {
  const [expandedItems, setExpandedItems] = useState([]);
  
  useEffect(() => {
    if (items.length > 0 && expandedItems.length === 0) {
      setExpandedItems(["item-0"]);
    }
  }, []);

  const addItem = () => {
    const newItems = [...items, {
      name: "",
      description: "",
      details: []
    }];
    onChange(newItems);
    
    setExpandedItems([...expandedItems, `item-${newItems.length - 1}`]);
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
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
    
    setExpandedItems(expandedItems
      .filter(id => id !== `item-${index}`)
      .map(id => {
        const itemIndex = parseInt(id.split('-')[1]);
        if (itemIndex > index) {
          return `item-${itemIndex - 1}`;
        }
        return id;
      })
    );
  };
  
  const duplicateItem = (index) => {
    const newItems = [...items];
    const duplicated = JSON.parse(JSON.stringify(newItems[index]));
    newItems.splice(index + 1, 0, duplicated);
    onChange(newItems);
    
    setExpandedItems([...expandedItems, `item-${index + 1}`]);
  };

  const toggleItem = (itemId) => {
    if (expandedItems.includes(itemId)) {
      setExpandedItems(expandedItems.filter(id => id !== itemId));
    } else {
      setExpandedItems([...expandedItems, itemId]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label className="text-sm font-medium">Itens</Label>
        <Button variant="outline" onClick={addItem} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Item
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="text-center py-4 border border-dashed rounded-lg">
          <p className="text-muted-foreground text-sm">Ainda não há itens definidos</p>
          <Button onClick={addItem} variant="ghost" size="sm" className="mt-1">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar primeiro item
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <Card key={`item-${index}`} className="border overflow-hidden">
              <div 
                className="p-2 flex items-center justify-between cursor-pointer"
                onClick={() => toggleItem(`item-${index}`)}
              >
                <div className="font-medium truncate text-sm">
                  {item.name || `Item ${index + 1}`}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateItem(index);
                    }}
                    title="Duplicar Item"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(index);
                    }}
                    title="Remover Item"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  {expandedItems.includes(`item-${index}`) ? 
                    <ChevronUp className="h-3.5 w-3.5" /> : 
                    <ChevronDown className="h-3.5 w-3.5" />
                  }
                </div>
              </div>
              {expandedItems.includes(`item-${index}`) && (
                <CardContent className="pt-0 pb-3">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-sm">Nome do Item</Label>
                      <Input
                        value={item.name}
                        onChange={e => updateItem(index, "name", e.target.value)}
                        placeholder="Ex: Parede, Janela, Piso..."
                        className="h-7 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Descrição</Label>
                      <Input
                        value={item.description}
                        onChange={e => updateItem(index, "description", e.target.value)}
                        placeholder="Descrição opcional do item"
                        className="h-7 text-sm"
                      />
                    </div>
                    <div className="max-h-64 overflow-auto">
                      <ItemDetailEditor
                        details={item.details || []}
                        onChange={details => updateItem(index, "details", details)}
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}