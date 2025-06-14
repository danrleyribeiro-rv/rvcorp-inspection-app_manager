// src/components/inspection/EnhancedDragDropProvider.jsx
"use client";

import { useDrop } from 'react-dnd';

export const DRAG_TYPES = {
  MEDIA: 'MEDIA_ITEM',
  TOPIC: 'TOPIC_ITEM',
  ITEM: 'ITEM_ELEMENT', 
  DETAIL: 'DETAIL_ELEMENT'
};

export function UniversalDropZone({ 
  topicIndex, 
  itemIndex = null, 
  detailIndex = null, 
  ncIndex = null, 
  onDropMedia,
  onDropTopic,
  onDropItem,
  onDropDetail,
  acceptTypes = [DRAG_TYPES.MEDIA],
  hasContent = false,
  children,
  className = ""
}) {
  const [{ isOver, dragItem }, drop] = useDrop({
    accept: acceptTypes,
    drop: (item, monitor) => {
      const itemType = monitor.getItemType();
      const destination = { 
        topicIndex, 
        itemIndex, 
        detailIndex, 
        ncIndex,
        level: detailIndex !== null ? 'detail' : (itemIndex !== null ? 'item' : 'topic')
      };
      
      // Prevent dropping on the exact same location for media only
      if (itemType === DRAG_TYPES.MEDIA && 
          item.topicIndex === topicIndex && 
          item.itemIndex === itemIndex && 
          item.detailIndex === detailIndex &&
          item.ncIndex === ncIndex) {
        return;
      }
      
      switch (itemType) {
        case DRAG_TYPES.MEDIA:
          onDropMedia?.(item, destination);
          break;
        case DRAG_TYPES.TOPIC:
          onDropTopic?.(item, destination);
          break;
        case DRAG_TYPES.ITEM:
          onDropItem?.(item, destination);
          break;
        case DRAG_TYPES.DETAIL:
          onDropDetail?.(item, destination);
          break;
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      dragItem: monitor.getItem()
    }),
  });
  
  return (
    <div 
      ref={drop} 
      className={`relative ${
        isOver ? 'ring-2 ring-primary ring-offset-2 rounded-md' : ''
      } ${className}`}
    >
      {children}
      {/* Overlay when dragging */}
      {isOver && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-md flex items-center justify-center z-10">
          <p className="text-sm font-medium text-primary">
            {dragItem?.sourceLevel === 'topic' && 'Mover tópico aqui'}
            {dragItem?.sourceLevel === 'item' && 'Mover item aqui'}
            {dragItem?.sourceLevel === 'detail' && 'Mover detalhe aqui'}
            {dragItem?.type === DRAG_TYPES.MEDIA && 'Solte mídia aqui'}
          </p>
        </div>
      )}
    </div>
  );
}