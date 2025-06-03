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
  const [expandedTopics, setExpandedTopics] = useState(new Set());
  
  useEffect(() => {
    // Auto-expand first topic when topics are added
    if (topics.length > 0 && expandedTopics.size === 0) {
      setExpandedTopics(new Set([0]));
    }
  }, [topics.length]);

  const addTopic = () => {
    const newTopics = [...topics, {
      name: `Novo Tópico ${topics.length + 1}`,
      description: "",
      items: []
    }];
    onChange(newTopics);
    
    // Auto-expand the new topic
    setExpandedTopics(prev => new Set([...prev, newTopics.length - 1]));
  };

  const updateTopic = (index, field, value) => {
    const newTopics = [...topics];
    newTopics[index] = { ...newTopics[index], [field]: value };
    onChange(newTopics);
  };

  const removeTopic = (index) => {
    const newTopics = topics.filter((_, i) => i !== index);
    onChange(newTopics);
    
    // Update expanded state for remaining topics
    const newExpanded = new Set();
    expandedTopics.forEach(topicIndex => {
      if (topicIndex < index) {
        newExpanded.add(topicIndex);
      } else if (topicIndex > index) {
        newExpanded.add(topicIndex - 1);
      }
    });
    setExpandedTopics(newExpanded);
  };

  const duplicateTopic = (index) => {
    const newTopics = [...topics];
    const duplicated = JSON.parse(JSON.stringify(topics[index]));
    duplicated.name = `${duplicated.name} (Cópia)`;
    newTopics.splice(index + 1, 0, duplicated);
    onChange(newTopics);
    
    // Auto-expand the duplicated topic
    setExpandedTopics(prev => {
      const newExpanded = new Set();
      prev.forEach(topicIndex => {
        if (topicIndex <= index) {
          newExpanded.add(topicIndex);
        } else {
          newExpanded.add(topicIndex + 1);
        }
      });
      newExpanded.add(index + 1);
      return newExpanded;
    });
  };

  const toggleTopic = (topicIndex) => {
    setExpandedTopics(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(topicIndex)) {
        newExpanded.delete(topicIndex);
      } else {
        newExpanded.add(topicIndex);
      }
      return newExpanded;
    });
  };

  const isExpanded = (topicIndex) => expandedTopics.has(topicIndex);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-lg font-semibold">Tópicos ({topics.length})</Label>
        <Button onClick={addTopic} size="sm" type="button">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Tópico
        </Button>
      </div>
      
      {topics.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <p className="text-muted-foreground mb-2">Ainda não há tópicos definidos</p>
          <Button onClick={addTopic} variant="outline" type="button">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar primeiro tópico
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {topics.map((topic, index) => {
            const expanded = isExpanded(index);
            
            return (
              <Card key={index} className="border overflow-hidden">
                <div 
                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => toggleTopic(index)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {expanded ? 
                      <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    }
                    <div className="flex-1">
                      <div className="font-medium truncate">
                        {topic.name || `Tópico ${index + 1}`}
                      </div>
                      {topic.description && (
                        <div className="text-sm text-muted-foreground truncate">
                          {topic.description}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {topic.items?.length || 0} ite{(topic.items?.length || 0) !== 1 ? 'ns' : 'm'}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => duplicateTopic(index)}
                      title="Duplicar Tópico"
                      type="button"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeTopic(index)}
                      title="Remover Tópico"
                      type="button"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                
                {expanded && (
                  <CardContent className="pt-0 pb-3 border-t bg-accent/10">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-sm">Nome do Tópico</Label>
                          <Input
                            value={topic.name || ""}
                            onChange={e => updateTopic(index, "name", e.target.value)}
                            placeholder="Ex: Sala de Estar, Cozinha, Banheiro..."
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm">Descrição</Label>
                          <Input
                            value={topic.description || ""}
                            onChange={e => updateTopic(index, "description", e.target.value)}
                            placeholder="Descrição opcional do tópico"
                            className="h-8"
                          />
                        </div>
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
            );
          })}
        </div>
      )}
    </div>
  );
}