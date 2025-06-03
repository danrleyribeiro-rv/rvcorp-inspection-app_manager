"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Trash2, 
  AlertTriangle,
  FileText,
  Layers
} from "lucide-react";
import DetailEditor from "./DetailEditor";

export default function InspectionTreeEditor({
  inspection,
  onUpdateInspection,
  onUpdateTopic,
  onUpdateItem,
  onUpdateDetail,
  onAddTopic,
  onRemoveTopic,
  onAddItem,
  onRemoveItem,
  onAddDetail,
  onRemoveDetail,
  onAddNonConformity,
  onRemoveNonConformity,
  onUpdateNonConformity,
  onUploadMedia,
  onRemoveMedia,
  onMoveMedia,
  onViewMedia,
  onMoveMediaDrop
}) {
  const [expandedTopics, setExpandedTopics] = useState(new Set());
  const [expandedItems, setExpandedItems] = useState(new Set());

  const toggleTopic = (topicIndex) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicIndex)) {
      newExpanded.delete(topicIndex);
      // Also collapse all items in this topic
      const itemsToRemove = Array.from(expandedItems).filter(key => 
        key.startsWith(`${topicIndex}-`)
      );
      itemsToRemove.forEach(key => expandedItems.delete(key));
      setExpandedItems(new Set(expandedItems));
    } else {
      newExpanded.add(topicIndex);
    }
    setExpandedTopics(newExpanded);
  };

  const toggleItem = (topicIndex, itemIndex) => {
    const key = `${topicIndex}-${itemIndex}`;
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedItems(newExpanded);
  };

  const getItemKey = (topicIndex, itemIndex) => `${topicIndex}-${itemIndex}`;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {inspection.title}
        </h2>
        <Button size="sm" onClick={onAddTopic}>
          <Plus className="mr-2 h-3 w-3" />
          Adicionar Tópico
        </Button>
      </div>

      {/* Topics Tree */}
      {inspection.topics?.map((topic, topicIndex) => (
        <div key={topicIndex} className="border-l-2 border-gray-200">
          {/* Topic Level */}
          <div className="flex items-center gap-1 py-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => toggleTopic(topicIndex)}
            >
              {expandedTopics.has(topicIndex) ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
            
            <div className="flex items-center gap-2 flex-1">
              <Layers className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm">
                Tópico {topicIndex + 1}: {topic.name || 'Sem nome'}
              </span>
              
              <div className="flex items-center gap-1 ml-auto">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() => onAddItem(topicIndex)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Item
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => onRemoveTopic(topicIndex)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          </div>

          {/* Topic Content */}
          {expandedTopics.has(topicIndex) && (
            <div className="ml-6 mb-3">
              <Card className="border-blue-200">
                <CardContent className="p-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Nome do Tópico</Label>
                      <Input
                        value={topic.name || ''}
                        onChange={e => onUpdateTopic(topicIndex, 'name', e.target.value)}
                        className="h-7 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Descrição</Label>
                      <Input
                        value={topic.description || ''}
                        onChange={e => onUpdateTopic(topicIndex, 'description', e.target.value)}
                        className="h-7 text-sm mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Observação do Tópico</Label>
                    <Textarea
                      value={topic.observation || ''}
                      onChange={e => onUpdateTopic(topicIndex, 'observation', e.target.value)}
                      rows={2}
                      className="text-sm mt-1"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Items Level */}
          {topic.items?.map((item, itemIndex) => {
            const itemKey = getItemKey(topicIndex, itemIndex);
            return (
              <div key={itemIndex} className="ml-6 border-l-2 border-gray-100">
                {/* Item Level */}
                <div className="flex items-center gap-1 py-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => toggleItem(topicIndex, itemIndex)}
                  >
                    {expandedItems.has(itemKey) ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </Button>
                  
                  <div className="flex items-center gap-2 flex-1">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">
                      Item {itemIndex + 1}: {item.name || 'Sem nome'}
                    </span>
                    
                    {item.details?.some(detail => detail.is_damaged) && (
                      <AlertTriangle className="h-3 w-3 text-orange-500" />
                    )}
                    
                    <div className="flex items-center gap-1 ml-auto">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => onAddDetail(topicIndex, itemIndex)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Detalhe
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => onRemoveItem(topicIndex, itemIndex)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Item Content */}
                {expandedItems.has(itemKey) && (
                  <div className="ml-6 mb-3">
                    <Card className="border-green-200">
                      <CardContent className="p-3 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Nome do Item</Label>
                            <Input
                              value={item.name || ''}
                              onChange={e => onUpdateItem(topicIndex, itemIndex, 'name', e.target.value)}
                              className="h-7 text-sm mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Descrição</Label>
                            <Input
                              value={item.description || ''}
                              onChange={e => onUpdateItem(topicIndex, itemIndex, 'description', e.target.value)}
                              className="h-7 text-sm mt-1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Observação do Item</Label>
                          <Textarea
                            value={item.observation || ''}
                            onChange={e => onUpdateItem(topicIndex, itemIndex, 'observation', e.target.value)}
                            rows={2}
                            className="text-sm mt-1"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Details Level */}
                {expandedItems.has(itemKey) && item.details?.map((detail, detailIndex) => (
                  <div key={detailIndex} className="ml-12 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-1 w-1 bg-gray-400 rounded-full"></div>
                      <span className="text-xs text-muted-foreground">
                        Detalhe {detailIndex + 1}: {detail.name}
                      </span>
                    </div>
                    <DetailEditor
                      detail={detail}
                      detailIndex={detailIndex}
                      topicIndex={topicIndex}
                      itemIndex={itemIndex}
                      onUpdateDetail={onUpdateDetail}
                      onRemoveDetail={onRemoveDetail}
                      onAddNonConformity={onAddNonConformity}
                      onRemoveNonConformity={onRemoveNonConformity}
                      onUpdateNonConformity={onUpdateNonConformity}
                      onUploadMedia={onUploadMedia}
                      onRemoveMedia={onRemoveMedia}
                      onMoveMedia={onMoveMedia}
                      onViewMedia={onViewMedia}
                      onMoveMediaDrop={onMoveMediaDrop}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}