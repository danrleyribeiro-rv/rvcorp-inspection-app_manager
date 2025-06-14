// src/components/inspection/UniversalMediaSection.jsx
"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, Image as ImageIcon, Video } from "lucide-react";
import DraggableMedia from "./DraggableMedia";
import MediaDropzone from "./MediaDropzone";

export default function UniversalMediaSection({
  media = [],
  level, // 'topic', 'item', or 'detail'
  topicIndex,
  itemIndex = null,
  detailIndex = null,
  ncIndex = null,
  isNC = false,
  onUpload,
  onRemove,
  onMove,
  onView,
  onMoveMediaDrop,
  title = "Mídia"
}) {
  const getId = () => {
    let id = `media-upload-${topicIndex}`;
    if (itemIndex !== null) id += `-${itemIndex}`;
    if (detailIndex !== null) id += `-${detailIndex}`;
    if (isNC && ncIndex !== null) id += `-nc-${ncIndex}`;
    return id;
  };


  const handleFileUpload = (file, isFromCamera = false) => {
    if (level === 'topic') {
      onUpload(topicIndex, null, null, file, false, null, isFromCamera);
    } else if (level === 'item') {
      onUpload(topicIndex, itemIndex, null, file, false, null, isFromCamera);
    } else if (level === 'detail') {
      onUpload(topicIndex, itemIndex, detailIndex, file, isNC, ncIndex, isFromCamera);
    }
  };

  const mediaCount = media?.length || 0;

  return (
    <div className="pt-1">
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs flex items-center gap-1">
          <ImageIcon className="h-3 w-3" />
          {title} ({mediaCount})
        </Label>
        <div className="flex gap-1">
          {/* Input para arquivos */}
          <input
            type="file"
            accept="image/*,video/*"
            onChange={e => {
              const file = e.target.files[0];
              if (file) {
                handleFileUpload(file, false);
              }
              e.target.value = '';
            }}
            style={{ display: 'none' }}
            id={getId()}
          />
          
          <Button
            size="sm"
            className="h-6 text-xs"
            onClick={() => document.getElementById(getId()).click()}
          >
            <Upload className="mr-1 h-3 w-3" />
            Arquivo
          </Button>
        </div>
      </div>
      
      {/* Always render drop zone as wrapper */}
      <MediaDropzone
        topicIndex={topicIndex}
        itemIndex={itemIndex}
        detailIndex={detailIndex}
        ncIndex={ncIndex}
        onDrop={onMoveMediaDrop}
        hasMedia={mediaCount > 0}
      >
        {mediaCount > 0 ? (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
            {media.map((mediaItem, mediaIndex) => (
              <DraggableMedia
                key={mediaIndex}
                media={mediaItem}
                topicIndex={topicIndex}
                itemIndex={itemIndex}
                detailIndex={detailIndex}
                mediaIndex={mediaIndex}
                isNC={isNC}
                ncIndex={ncIndex}
                onView={onView}
                onRemove={onRemove}
                onMove={onMove}
              />
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-md p-2 min-h-[60px] flex items-center justify-center text-xs text-muted-foreground">
            Arraste uma mídia para cá ou clique nos botões acima
          </div>
        )}
      </MediaDropzone>
    </div>
  );
}