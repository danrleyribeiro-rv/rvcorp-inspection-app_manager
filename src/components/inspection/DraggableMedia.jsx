// src/components/inspection/DraggableMedia.jsx
"use client";

import { useDrag } from 'react-dnd';
import { Button } from "@/components/ui/button";
import { X, Move, Video } from "lucide-react";

export default function DraggableMedia({ 
  media, 
  topicIndex, 
  itemIndex = null, 
  detailIndex = null, 
  mediaIndex, 
  isNC = false, 
  ncIndex = null, 
  onView, 
  onRemove, 
  onMove 
}) {
  const [{ isDragging }, drag] = useDrag({
    type: 'MEDIA_ITEM',
    item: { 
      media, 
      topicIndex, 
      itemIndex, 
      detailIndex, 
      mediaIndex,
      isNC,
      ncIndex,
      sourceLevel: detailIndex !== null ? 'detail' : (itemIndex !== null ? 'item' : 'topic')
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });
  
  return (
    <div 
      ref={drag}
      className={`relative group ${isDragging ? 'opacity-50' : ''}`}
      onClick={() => onView(media, topicIndex, itemIndex, detailIndex, mediaIndex, isNC, ncIndex)}
      style={{ cursor: 'grab' }}
    >
      <div className="aspect-square border rounded-md overflow-hidden bg-gray-50">
        {media.type === 'image' ? (
          <img
            src={media.url}
            alt="Media"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="h-6 w-6 text-gray-400" />
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant="destructive"
        className="absolute top-0 right-0 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(topicIndex, itemIndex, detailIndex, mediaIndex, isNC, ncIndex);
        }}
      >
        <X className="h-2 w-2" />
      </Button>
      <Button
        size="sm"
        variant="secondary"
        className="absolute bottom-0 right-0 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onMove(media, topicIndex, itemIndex, detailIndex, mediaIndex, isNC, ncIndex);
        }}
      >
        <Move className="h-2 w-2" />
      </Button>
    </div>
  );
}