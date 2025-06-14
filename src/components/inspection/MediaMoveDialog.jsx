// src/components/inspection/MediaMoveDialog.jsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, ChevronDown, Image, Video } from "lucide-react";

export default function MediaMoveDialog({ 
  open, 
  onClose, 
  inspection, 
  selectedMediaContext, 
  onMove 
}) {
  const [expandedTopics, setExpandedTopics] = useState([]);
  const [expandedItems, setExpandedItems] = useState([]);
  const [destination, setDestination] = useState(null);

  const toggleTopic = (topicIndex) => {
    if (expandedTopics.includes(topicIndex)) {
      setExpandedTopics(expandedTopics.filter(i => i !== topicIndex));
    } else {
      setExpandedTopics([...expandedTopics, topicIndex]);
    }
  };

  const toggleItem = (topicIndex, itemIndex) => {
    const key = `${topicIndex}-${itemIndex}`;
    if (expandedItems.includes(key)) {
      setExpandedItems(expandedItems.filter(i => i !== key));
    } else {
      setExpandedItems([...expandedItems, key]);
    }
  };

  const selectDestination = (topicIndex, itemIndex = null, detailIndex = null, ncIndex = null) => {
    setDestination({ 
      topicIndex, 
      itemIndex, 
      detailIndex, 
      ncIndex,
      targetLevel: detailIndex !== null ? 'detail' : (itemIndex !== null ? 'item' : 'topic')
    });
  };

  const handleMoveMedia = () => {
    if (destination) {
      // Criar objeto de destino
      const targetDestination = {
        topicIndex: destination.topicIndex,
        itemIndex: destination.itemIndex,
        detailIndex: destination.detailIndex,
        ncIndex: destination.ncIndex,
        targetLevel: destination.targetLevel
      };
      
      onMove(selectedMediaContext, targetDestination);
      onClose();
    }
  };

  const getDestinationLabel = () => {
    if (!destination) return "Nenhum destino selecionado";
    
    const topic = inspection.topics[destination.topicIndex];
    let label = `📁 ${topic.name || `Tópico ${destination.topicIndex + 1}`}`;
    
    if (destination.targetLevel === 'item' && destination.itemIndex !== null) {
      const item = topic.items[destination.itemIndex];
      label += ` → 📋 ${item.name || `Item ${destination.itemIndex + 1}`}`;
    } else if (destination.targetLevel === 'detail' && destination.itemIndex !== null && destination.detailIndex !== null) {
      const item = topic.items[destination.itemIndex];
      const detail = item.details[destination.detailIndex];
      label += ` → 📋 ${item.name || `Item ${destination.itemIndex + 1}`} → 📄 ${detail.name || `Detalhe ${destination.detailIndex + 1}`}`;
    }
    
    if (destination.ncIndex !== null) {
      label += ` → ⚠️ NC ${destination.ncIndex + 1}`;
    }
    
    return label;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-base">Mover Mídia</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4 mt-2">
          <div className="space-y-2">
            {inspection.topics.map((topic, topicIndex) => (
              <div key={topicIndex} className="border rounded-md">
                <div className="space-y-1">
                  {/* Topic as destination */}
                  <div 
                    className={`p-2 cursor-pointer hover:bg-gray-50 border-b ${destination && 
                      destination.topicIndex === topicIndex &&
                      destination.targetLevel === 'topic'
                        ? 'bg-blue-50 border-blue-300'
                        : 'border-gray-200'
                    }`}
                    onClick={() => selectDestination(topicIndex)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-blue-600">
                        📁 {topic.name || `Tópico ${topicIndex + 1}`} (Nível Tópico)
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {topic.media?.length > 0 && (
                          <span>{topic.media.length} mídia{topic.media.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Topic expansion toggle */}
                  <div 
                    className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleTopic(topicIndex)}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {expandedTopics.includes(topicIndex) ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />}
                      Ver Itens e Detalhes
                    </div>
                  </div>
                </div>
                
                {expandedTopics.includes(topicIndex) && (
                  <div className="pl-4 pr-2 pb-2 space-y-1">
                    {topic.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="border rounded-md">
                        <div className="space-y-1">
                          {/* Item as destination */}
                          <div 
                            className={`p-2 cursor-pointer hover:bg-gray-50 border-b ${destination && 
                              destination.topicIndex === topicIndex &&
                              destination.itemIndex === itemIndex &&
                              destination.targetLevel === 'item'
                                ? 'bg-blue-50 border-blue-300'
                                : 'border-gray-200'
                            }`}
                            onClick={() => selectDestination(topicIndex, itemIndex)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-medium text-green-600">
                                📋 {item.name || `Item ${itemIndex + 1}`} (Nível Item)
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                {item.media?.length > 0 && (
                                  <span>{item.media.length} mídia{item.media.length !== 1 ? 's' : ''}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Item expansion toggle */}
                          <div 
                            className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50"
                            onClick={() => toggleItem(topicIndex, itemIndex)}
                          >
                            <div className="flex items-center gap-2 text-xs">
                              {expandedItems.includes(`${topicIndex}-${itemIndex}`) ? 
                                <ChevronDown className="h-3 w-3" /> : 
                                <ChevronRight className="h-3 w-3" />}
                              Ver Detalhes
                            </div>
                          </div>
                        </div>
                        
                        {expandedItems.includes(`${topicIndex}-${itemIndex}`) && (
                          <div className="pl-4 pr-2 pb-2 space-y-1">
                            {item.details.map((detail, detailIndex) => (
                              <div 
                                key={detailIndex} 
                                className={`p-2 border rounded-md cursor-pointer hover:bg-gray-50 ${
                                  destination && 
                                  destination.topicIndex === topicIndex &&
                                  destination.itemIndex === itemIndex &&
                                  destination.detailIndex === detailIndex &&
                                  !destination.ncIndex
                                    ? 'bg-blue-50 border-blue-300'
                                    : ''
                                }`}
                                onClick={() => selectDestination(topicIndex, itemIndex, detailIndex)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="text-xs">{detail.name || `Detalhe ${detailIndex + 1}`}</div>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    {detail.media?.length > 0 && (
                                      <div className="flex items-center">
                                        <Image className="h-3 w-3 mr-1" />
                                        {detail.media.filter(m => m.type === 'image').length}
                                      </div>
                                    )}
                                    {detail.media?.filter(m => m.type === 'video').length > 0 && (
                                      <div className="flex items-center ml-1">
                                        <Video className="h-3 w-3 mr-1" />
                                        {detail.media.filter(m => m.type === 'video').length}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* NC options for moving */}
                                {detail.non_conformities && detail.non_conformities.length > 0 && (
                                  <div className="mt-2 pl-3 space-y-1 border-l-2 border-l-red-200">
                                    {detail.non_conformities.map((nc, ncIndex) => (
                                      <div 
                                        key={ncIndex}
                                        className={`p-1 border rounded-sm cursor-pointer hover:bg-gray-50 ${
                                          destination && 
                                          destination.topicIndex === topicIndex &&
                                          destination.itemIndex === itemIndex &&
                                          destination.detailIndex === detailIndex &&
                                          destination.ncIndex === ncIndex
                                            ? 'bg-blue-50 border-blue-300'
                                            : ''
                                        }`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          selectDestination(topicIndex, itemIndex, detailIndex, ncIndex);
                                        }}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="text-xs">NC {ncIndex + 1}</div>
                                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            {nc.media?.length > 0 && (
                                              <div className="flex items-center">
                                                <Image className="h-2 w-2 mr-1" />
                                                {nc.media.filter(m => m.type === 'image').length}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <div className="space-y-2 mt-2 pt-2 border-t">
          {destination && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm">
              <div className="font-medium text-blue-800 mb-1">Destino selecionado:</div>
              <div className="text-blue-700">{getDestinationLabel()}</div>
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button size="sm" onClick={handleMoveMedia} disabled={!destination}>
              Mover Mídia
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}