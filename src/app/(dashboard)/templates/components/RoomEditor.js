// src/app/(dashboard)/templates/components/RoomEditor.js
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Copy } from "lucide-react";
import ItemEditor from "./ItemEditor";

export default function RoomEditor({ rooms, onChange }) {
  const addRoom = () => {
    onChange([...rooms, {
      name: "",
      description: "",
      items: [],
      media_requirements: {
        images: {
          min: 0,
          max: 5
        },
        videos: {
          min: 0,
          max: 2
        }
      }
    }]);
  };

  const updateRoom = (index, field, value) => {
    const newRooms = [...rooms];
    if (field.includes('.')) {
      const [main, sub, prop] = field.split('.');
      newRooms[index][main] = newRooms[index][main] || {};
      newRooms[index][main][sub] = newRooms[index][main][sub] || {};
      const numberValue = Number(value);
      newRooms[index][main][sub][prop] = isNaN(numberValue) ? 0 : numberValue;
    } else {
      newRooms[index][field] = value;
    }
    onChange(newRooms);
  };

  const removeRoom = (index) => {
    onChange(rooms.filter((_, i) => i !== index));
  };

  const duplicateRoom = (index) => {
    const newRooms = [...rooms];
    newRooms.splice(index + 1, 0, JSON.parse(JSON.stringify(rooms[index])));
    onChange(newRooms);
  };

  const handleNumberChange = (index, field, value) => {
    const newRooms = [...rooms];
    if (field.includes('.')) {
      const [main, sub, prop] = field.split('.');
      newRooms[index][main] = newRooms[index][main] || {};
      newRooms[index][main][sub] = newRooms[index][main][sub] || {};
      // Remover caracteres não numéricos e converter
      const numericValue = value.replace(/[^0-9]/g, '');
      const parsedValue = parseInt(numericValue) || 0;
      newRooms[index][main][sub][prop] = parsedValue.toString();
    }
    onChange(newRooms);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-lg font-semibold">Dependências</Label>
        <Button onClick={addRoom}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Dependência
        </Button>
      </div>

      {rooms.map((room, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Dependência {index + 1}</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => duplicateRoom(index)}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeRoom(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Dependência</Label>
              <Input
                value={room.name}
                onChange={e => updateRoom(index, "name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={room.description}
                onChange={e => updateRoom(index, "description", e.target.value)}
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
                      value={room.media_requirements?.images?.min || "0"}
                      onChange={e => handleNumberChange(index, "media_requirements.images.min", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Máximo</Label>
                    <Input
                      type="number"
                      min="0"
                      value={room.media_requirements?.images?.max || "0"}
                      onChange={e => handleNumberChange(index, "media_requirements.images.max", e.target.value)}
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
                      value={room.media_requirements?.videos?.min || 0}
                      onChange={e => handleNumberChange(index, "media_requirements.videos.min", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Máximo</Label>
                    <Input
                      type="number"
                      min="0"
                      value={room.media_requirements?.videos?.max || 0}
                      onChange={e => handleNumberChange(index, "media_requirements.videos.max", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <ItemEditor
              items={room.items || []}
              onChange={items => updateRoom(index, "items", items)}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}