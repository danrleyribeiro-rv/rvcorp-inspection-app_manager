// src/components/inspection/DraggableStructureItem.jsx
"use client";

import { useDrag } from 'react-dnd';
import { Button } from "@/components/ui/button";
import { GripVertical, Copy, ArrowUp, ArrowDown } from "lucide-react";
import { DRAG_TYPES } from './EnhancedDragDropProvider';

export function DraggableTopic({ 
  topic, 
  topicIndex, 
  isActive,
  onSelect,
  onReorder,
  onDuplicate,
  onRemove,
  children 
}) {
  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: DRAG_TYPES.TOPIC,
    item: { 
      topic, 
      topicIndex,
      sourceLevel: 'topic',
      type: DRAG_TYPES.TOPIC
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });
  
  return (
    <div ref={dragPreview} className={`${isDragging ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-1 p-1">
        <div ref={drag} className="flex items-center gap-1 cursor-grab active:cursor-grabbing">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          {children}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onReorder(topicIndex, -1);
            }}
            disabled={topicIndex === 0}
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onReorder(topicIndex, 1);
            }}
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(topicIndex);
            }}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DraggableItem({ 
  item, 
  topicIndex,
  itemIndex, 
  isActive,
  onSelect,
  onReorder,
  onDuplicate,
  onRemove,
  children 
}) {
  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: DRAG_TYPES.ITEM,
    item: { 
      item, 
      topicIndex,
      itemIndex,
      sourceLevel: 'item',
      type: DRAG_TYPES.ITEM
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });
  
  return (
    <div ref={dragPreview} className={`${isDragging ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-1 p-1">
        <div ref={drag} className="flex items-center gap-1 cursor-grab active:cursor-grabbing">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          {children}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onReorder(topicIndex, itemIndex, -1);
            }}
            disabled={itemIndex === 0}
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onReorder(topicIndex, itemIndex, 1);
            }}
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(topicIndex, itemIndex);
            }}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DraggableDetail({ 
  detail, 
  topicIndex,
  itemIndex,
  detailIndex, 
  onReorder,
  onDuplicate,
  onRemove,
  children 
}) {
  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: DRAG_TYPES.DETAIL,
    item: { 
      detail, 
      topicIndex,
      itemIndex,
      detailIndex,
      sourceLevel: 'detail',
      type: DRAG_TYPES.DETAIL
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });
  
  return (
    <div ref={dragPreview} className={`${isDragging ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-1 p-1">
        <div ref={drag} className="flex items-center gap-1 cursor-grab active:cursor-grabbing">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          {children}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onReorder(topicIndex, itemIndex, detailIndex, -1);
            }}
            disabled={detailIndex === 0}
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onReorder(topicIndex, itemIndex, detailIndex, 1);
            }}
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(topicIndex, itemIndex, detailIndex);
            }}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}