// src/components/inspection/MediaSection.jsx
"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, Camera } from "lucide-react";
import DraggableMedia from "./DraggableMedia";
import MediaDropzone from "./MediaDropzone";

export default function MediaSection({
  media = [],
  topicIndex,
  itemIndex,
  detailIndex,
  onUpload,
  onRemove,
  onMove,
  onView,
  onMoveMediaDrop
}) {
  return (
    <div className="pt-1">
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs">Mídia ({media?.length || 0})</Label>
        <div className="flex gap-1">
          {/* Input para arquivos */}
          <input
            type="file"
            accept="image/*,video/*"
            onChange={e => {
              const file = e.target.files[0];
              if (file) {
                onUpload(topicIndex, itemIndex, detailIndex, file);
              }
              e.target.value = '';
            }}
            style={{ display: 'none' }}
            id={`media-upload-${topicIndex}-${itemIndex}-${detailIndex}`}
          />
          
          {/* Input para câmera */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={e => {
              const file = e.target.files[0];
              if (file) {
                onUpload(topicIndex, itemIndex, detailIndex, file);
              }
              e.target.value = '';
            }}
            style={{ display: 'none' }}
            id={`camera-upload-${topicIndex}-${itemIndex}-${detailIndex}`}
          />
          
          <Button
            size="sm"
            className="h-6 text-xs"
            onClick={() => document.getElementById(`media-upload-${topicIndex}-${itemIndex}-${detailIndex}`).click()}
          >
            <Upload className="mr-1 h-3 w-3" />
            Arquivo
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs"
            onClick={() => document.getElementById(`camera-upload-${topicIndex}-${itemIndex}-${detailIndex}`).click()}
          >
            <Camera className="mr-1 h-3 w-3" />
            Câmera
          </Button>
        </div>
      </div>
      
      {/* Always render drop zone as wrapper */}
      <MediaDropzone
        topicIndex={topicIndex}
        itemIndex={itemIndex}
        detailIndex={detailIndex}
        onDrop={onMoveMediaDrop}
        hasMedia={media && media.length > 0}
      >
        {media && media.length > 0 ? (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
            {media.map((mediaItem, mediaIndex) => (
              <DraggableMedia
                key={mediaIndex}
                media={mediaItem}
                topicIndex={topicIndex}
                itemIndex={itemIndex}
                detailIndex={detailIndex}
                mediaIndex={mediaIndex}
                onView={onView}
                onRemove={onRemove}
                onMove={onMove}
              />
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-md p-2 min-h-[60px] flex items-center justify-center text-xs text-muted-foreground">
            Arraste uma mídia para cá ou clique no botão acima
          </div>
        )}
      </MediaDropzone>
    </div>
  );
}