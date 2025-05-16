// app/(dashboard)/templates/components/TopicEditor.js
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Copy } from "lucide-react";
import ItemEditor from "./ItemEditor";

export default function TopicEditor({ topics = [], onChange }) {
  const addTopic = () => {
    onChange([...topics, {
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

  const updateTopic = (index, field, value) => {
    const newTopics = [...topics];
    if (field.includes('.')) {
      const [main, sub, prop] = field.split('.');
      newTopics[index][main] = newTopics[index][main] || {};
      newTopics[index][main][sub] = newTopics[index][main][sub] || {};
      const numberValue = Number(value);
      newTopics[index][main][sub][prop] = isNaN(numberValue) ? 0 : numberValue;
    } else {
      newTopics[index][field] = value;
    }
    onChange(newTopics);
  };

  const removeTopic = (index) => {
    onChange(topics.filter((_, i) => i !== index));
  };

  const duplicateTopic = (index) => {
    const newTopics = [...topics];
    newTopics.splice(index + 1, 0, JSON.parse(JSON.stringify(topics[index])));
    onChange(newTopics);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-lg font-semibold">Dependências</Label>
        <Button onClick={addTopic}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Dependência
        </Button>
      </div>

      {topics.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <p className="text-muted-foreground">Ainda não há dependências definidas</p>
          <Button onClick={addTopic} variant="outline" className="mt-2">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar primeira dependência
          </Button>
        </div>
      ) : (
        topics.map((topic, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Dependência {index + 1}</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => duplicateTopic(index)}
                  title="Duplicar Dependência"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTopic(index)}
                  title="Remover Dependência"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Dependência</Label>
                <Input
                  value={topic.name}
                  onChange={e => updateTopic(index, "name", e.target.value)}
                  placeholder="Ex: Sala de Estar, Cozinha, Banheiro..."
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={topic.description}
                  onChange={e => updateTopic(index, "description", e.target.value)}
                  placeholder="Descrição opcional da dependência"
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
                        value={topic.media_requirements?.images?.min || 0}
                        onChange={e => updateTopic(index, "media_requirements.images.min", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Máximo</Label>
                      <Input
                        type="number"
                        min="0"
                        value={topic.media_requirements?.images?.max || 0}
                        onChange={e => updateTopic(index, "media_requirements.images.max", e.target.value)}
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
                        value={topic.media_requirements?.videos?.min || 0}
                        onChange={e => updateTopic(index, "media_requirements.videos.min", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Máximo</Label>
                      <Input
                        type="number"
                        min="0"
                        value={topic.media_requirements?.videos?.max || 0}
                        onChange={e => updateTopic(index, "media_requirements.videos.max", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <ItemEditor
                items={topic.items || []}
                onChange={items => updateTopic(index, "items", items)}
              />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}