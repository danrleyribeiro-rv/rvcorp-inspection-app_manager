// src/components/inspection/MediaDropzone.jsx
"use client";

import { useDrop } from 'react-dnd';

export default function MediaDropzone({ 
  topicIndex, 
  itemIndex, 
  detailIndex, 
  ncIndex = null, 
  onDrop 
}) {
  const [{ isOver }, drop] = useDrop({
    accept: 'MEDIA_ITEM',
    drop: (item) => {
      onDrop(item, { 
        topicIndex, 
        itemIndex, 
        detailIndex, 
        ncIndex 
      });
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });
  
  return (
    <div 
      ref={drop} 
      className={`border-2 border-dashed rounded-md p-1 min-h-[60px] flex items-center justify-center ${
        isOver ? 'border-primary bg-primary/10' : 'border-gray-200'
      }`}
    >
      <p className="text-xs text-muted-foreground">Arraste uma mídia para cá</p>
    </div>
  );
}