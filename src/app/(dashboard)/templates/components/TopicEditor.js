// src/app/(dashboard)/templates/components/TopicEditor.js
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Copy, ChevronDown, ChevronUp } from "lucide-react";
import ItemEditor from "./ItemEditor";

export default function TopicEditor({ topics = [], onChange }) {
  const [expandedTopics, setExpandedTopics] = useState([]);
  
  useEffect(() => {
    if (topics.length > 0 && expandedTopics.length === 0) {
      setExpandedTopics(["topic-0"]);
    }
  }, []);

  const addTopic = () => {
    const newTopics = [...topics, {
      name: "",
      description: "",
      items: []
    }];
    onChange(newTopics);
    
    setExpandedTopics([...expandedTopics, `topic-${newTopics.length - 1}`]);
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
    
    setExpandedTopics(expandedTopics
      .filter(id => id !== `topic-${index}`)
      .map(id => {
        const topicIndex = parseInt(id.split('-')[1]);
        if (topicIndex > index) {
          return `topic-${topicIndex - 1}`;
        }
        return id;
      })
    );
  };

  const duplicateTopic = (index) => {
    const newTopics = [...topics];
    const duplicated = JSON.parse(JSON.stringify(topics[index]));
    newTopics.splice(index + 1, 0, duplicated);
    onChange(newTopics);
    
    setExpandedTopics([...expandedTopics, `topic-${index + 1}`]);
  };

  const toggleTopic = (topicId) => {
    if (expandedTopics.includes(topicId)) {
      setExpandedTopics(expandedTopics.filter(id => id !== topicId));
    } else {
      setExpandedTopics([...expandedTopics, topicId]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-lg font-semibold">Tópicos</Label>
        <Button onClick={addTopic} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Tópico
        </Button>
      </div>
      {topics.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <p className="text-muted-foreground">Ainda não há tópicos definidos</p>
          <Button onClick={addTopic} variant="outline" className="mt-2">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar primeiro tópico
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {topics.map((topic, index) => (
            <Card key={`topic-${index}`} className="border overflow-hidden">
              <div 
                className="p-3 flex items-center justify-between cursor-pointer"
                onClick={() => toggleTopic(`topic-${index}`)}
              >
                <div className="font-medium truncate">
                  {topic.name || `Tópico ${index + 1}`}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateTopic(index);
                    }}
                    title="Duplicar Tópico"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTopic(index);
                    }}
                    title="Remover Tópico"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  {expandedTopics.includes(`topic-${index}`) ? 
                    <ChevronUp className="h-4 w-4" /> : 
                    <ChevronDown className="h-4 w-4" />
                  }
                </div>
              </div>
              {expandedTopics.includes(`topic-${index}`) && (
                <CardContent className="pt-0 pb-3">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-sm">Nome do Tópico</Label>
                      <Input
                        value={topic.name}
                        onChange={e => updateTopic(index, "name", e.target.value)}
                        placeholder="Ex: Sala de Estar, Cozinha, Banheiro..."
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Descrição</Label>
                      <Input
                        value={topic.description}
                        onChange={e => updateTopic(index, "description", e.target.value)}
                        placeholder="Descrição opcional da dependência"
                        className="h-8"
                      />
                    </div>
                    <div className="max-h-96 overflow-auto">
                      <ItemEditor
                        items={topic.items || []}
                        onChange={items => updateTopic(index, "items", items)}
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