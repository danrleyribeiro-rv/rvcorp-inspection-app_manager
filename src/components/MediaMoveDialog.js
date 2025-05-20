// components/MediaMoveDialog.js
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, ChevronDown, Image, Video } from "lucide-react";

export function MediaMoveDialog({ onClose, onMove, inspection }) {
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

  const selectDestination = (topicIndex, itemIndex, detailIndex) => {
    setDestination({ topicIndex, itemIndex, detailIndex });
  };

  const handleMove = () => {
    if (destination) {
      onMove(destination);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Mover Mídia</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4 mt-4">
          <div className="space-y-2">
            {inspection.topics.map((topic, topicIndex) => (
              <div key={topicIndex} className="border rounded-md">
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleTopic(topicIndex)}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {expandedTopics.includes(topicIndex) ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />}
                    {topic.name || `Tópico ${topicIndex + 1}`}
                  </div>
                </div>
                
                {expandedTopics.includes(topicIndex) && (
                  <div className="pl-6 pr-3 pb-3 space-y-2">
                    {topic.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="border rounded-md">
                        <div 
                          className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleItem(topicIndex, itemIndex)}
                        >
                          <div className="flex items-center gap-2">
                            {expandedItems.includes(`${topicIndex}-${itemIndex}`) ? 
                              <ChevronDown className="h-4 w-4" /> : 
                              <ChevronRight className="h-4 w-4" />}
                            {item.name || `Item ${itemIndex + 1}`}
                          </div>
                        </div>
                        
                        {expandedItems.includes(`${topicIndex}-${itemIndex}`) && (
                          <div className="pl-6 pr-3 pb-2 space-y-2">
                            {item.details.map((detail, detailIndex) => (
                              <div 
                                key={detailIndex} 
                                className={`p-2 border rounded-md cursor-pointer hover:bg-gray-50 ${
                                  destination && 
                                  destination.topicIndex === topicIndex &&
                                  destination.itemIndex === itemIndex &&
                                  destination.detailIndex === detailIndex
                                    ? 'bg-blue-50 border-blue-300'
                                    : ''
                                }`}
                                onClick={() => selectDestination(topicIndex, itemIndex, detailIndex)}
                              >
                                <div className="flex items-center justify-between">
                                  <div>{detail.name || `Detalhe ${detailIndex + 1}`}</div>
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    {detail.media?.length > 0 && (
                                      <div className="flex items-center">
                                        <Image className="h-3 w-3 mr-1" />
                                        {detail.media.filter(m => m.type === 'image').length}
                                      </div>
                                    )}
                                    {detail.media?.filter(m => m.type === 'video').length > 0 && (
                                      <div className="flex items-center ml-2">
                                        <Video className="h-3 w-3 mr-1" />
                                        {detail.media.filter(m => m.type === 'video').length}
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
        </ScrollArea>
        
        <div className="flex justify-end gap-2 mt-4 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleMove} disabled={!destination}>Mover</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}