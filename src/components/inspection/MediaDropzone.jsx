// src/components/inspection/MediaDropzone.jsx
"use client";

import { useDrop } from 'react-dnd';

export default function MediaDropzone({ 
  topicIndex, 
  itemIndex, 
  detailIndex, 
  ncIndex = null, 
  onDrop,
  hasMedia = false,
  children 
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
      className={`relative ${
        isOver ? 'ring-2 ring-primary ring-offset-2 rounded-md' : ''
      }`}
    >
      {children}
      {/* Overlay when dragging */}
      {isOver && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-md flex items-center justify-center z-10">
          <p className="text-sm font-medium text-primary">Solte aqui</p>
        </div>
      )}
    </div>
  );
}