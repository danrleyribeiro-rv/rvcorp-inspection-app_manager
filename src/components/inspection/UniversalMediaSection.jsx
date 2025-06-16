// src/components/inspection/UniversalMediaSection.jsx
"use client";

import { useState } from "react";
import { useDrag } from 'react-dnd';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Image, Video, Eye, Move, Trash2, X } from "lucide-react";
import { UniversalDropZone, DRAG_TYPES } from "./EnhancedDragDropProvider";

// Componente DraggableMediaItem local
function DraggableMediaItem({ media, context, onView, onMove, onRemove }) {
  const [{ isDragging }, drag] = useDrag({
    type: DRAG_TYPES.MEDIA,
    item: { 
      media,
      ...context,
      type: DRAG_TYPES.MEDIA
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  return (
    <div
      ref={drag}
      className={`group relative border rounded-lg overflow-hidden bg-white hover:shadow-sm transition-all cursor-grab ${
        isDragging ? 'opacity-50' : ''
      }`}
      onClick={() => onView()}
    >
      <div className="aspect-square relative">
        {media.type === 'image' ? (
          <img
            src={media.url}
            alt="Media"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <Video className="h-6 w-6 text-gray-400" />
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="destructive"
          className="h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="secondary"
          className="h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onMove();
          }}
        >
          <Move className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export default function UniversalMediaSection({
  media = [],
  level,
  topicIndex,
  itemIndex = null,
  detailIndex = null,
  ncIndex = null,
  onUpload,
  onRemove,
  onMove,
  onView,
  onMoveMediaDrop,
  title = "Mídia",
  showUpload = true,
  className = ""
}) {
  const hasContent = media && media.length > 0;

  const handleUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0 && onUpload) {
      onUpload(files, { topicIndex, itemIndex, detailIndex, ncIndex });
    }
  };

  const handleRemove = (mediaIndex) => {
    if (onRemove) {
      onRemove(topicIndex, itemIndex, detailIndex, mediaIndex, ncIndex);
    }
  };

  const handleView = (mediaItem) => {
    if (onView) {
      onView(mediaItem);
    }
  };

  const handleMove = (mediaIndex) => {
    if (onMove) {
      onMove(topicIndex, itemIndex, detailIndex, mediaIndex, ncIndex);
    }
  };

  return (
    <UniversalDropZone
      topicIndex={topicIndex}
      itemIndex={itemIndex}
      detailIndex={detailIndex}
      ncIndex={ncIndex}
      onDropMedia={onMoveMediaDrop}
      acceptTypes={[DRAG_TYPES.MEDIA]}
      hasContent={hasContent}
      className={className}
    >
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {media.length} item{media.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* Upload Section */}
          {showUpload && (
            <div className="mb-4">
              <input
                type="file"
                id={`upload-${level}-${topicIndex}-${itemIndex || 'x'}-${detailIndex || 'x'}-${ncIndex || 'x'}`}
                multiple
                accept="image/*,video/*"
                onChange={handleUpload}
                className="hidden"
              />
              <label
                htmlFor={`upload-${level}-${topicIndex}-${itemIndex || 'x'}-${detailIndex || 'x'}-${ncIndex || 'x'}`}
                className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
              >
                <div className="text-center">
                  <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Clique para adicionar mídia
                  </p>
                  <p className="text-xs text-gray-400">
                    Imagens e vídeos
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Media Grid */}
          {media.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {media.map((mediaItem, mediaIndex) => (
                <DraggableMediaItem
                  key={mediaIndex}
                  media={mediaItem}
                  context={{
                    topicIndex,
                    itemIndex,
                    detailIndex,
                    mediaIndex,
                    ncIndex,
                    level
                  }}
                  onView={() => handleView(mediaItem)}
                  onMove={() => handleMove(mediaIndex)}
                  onRemove={() => handleRemove(mediaIndex)}
                />
              ))}
            </div>
          ) : (
            !showUpload && (
              <div className="text-center py-8 text-gray-500">
                <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma mídia</p>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </UniversalDropZone>
  );
}