// src/components/inspection/DraggableMedia.jsx
"use client";

import { useDrag } from 'react-dnd';
import { Button } from "@/components/ui/button";
import { X, Move, Video, Droplets, RotateCw, Crop } from "lucide-react";

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
  onMove,
  onWatermark,
  onCrop,
  onRotate
}) {
  
  const context = {
    topicIndex,
    itemIndex,
    detailIndex,
    mediaIndex,
    isNC,
    ncIndex
  };
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
            src={media.cloudUrl}
            alt="Media"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="h-6 w-6 text-gray-400" />
          </div>
        )}
      </div>
      {/* Action buttons */}
      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
        <Button
          size="sm"
          variant="secondary"
          className="h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onMove && onMove(media, context);
          }}
          title="Mover"
        >
          <Move className="h-3 w-3" />
        </Button>
        {media.type === 'image' && onWatermark && (
          <Button
            size="sm"
            variant="secondary"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onWatermark(media, context);
            }}
            title="Marca d'água"
          >
            <Droplets className="h-3 w-3" />
          </Button>
        )}
        {media.type === 'image' && onCrop && (
          <Button
            size="sm"
            variant="secondary"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onCrop(media, context);
            }}
            title="Cortar 4:3"
          >
            <Crop className="h-3 w-3" />
          </Button>
        )}
        {media.type === 'image' && onRotate && (
          <Button
            size="sm"
            variant="secondary"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onRotate(media, context, 90);
            }}
            title="Rotacionar 90°"
          >
            <RotateCw className="h-3 w-3" />
          </Button>
        )}
        <Button
          size="sm"
          variant="destructive"
          className="h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(topicIndex, itemIndex, detailIndex, mediaIndex, isNC, ncIndex);
          }}
          title="Remover"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}