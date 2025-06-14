// src/components/inspection/DetailEditor.jsx
"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2 } from "lucide-react";
import UniversalMediaSection from "./UniversalMediaSection";
import NonConformityEditor from "./NonConformityEditor";
import { UniversalDropZone, DRAG_TYPES } from "./EnhancedDragDropProvider";
import { DraggableDetail } from "./DraggableStructureItem";

export default function DetailEditor({
  detail,
  detailIndex,
  topicIndex,
  itemIndex,
  onUpdateDetail,
  onRemoveDetail,
  onAddNonConformity,
  onRemoveNonConformity,
  onUpdateNonConformity,
  onUploadMedia,
  onRemoveMedia,
  onMoveMedia,
  onViewMedia,
  onMoveMediaDrop,
  onReorderDetail,
  onDuplicateDetail,
  onMoveStructureDrop
}) {
  return (
    <UniversalDropZone
      topicIndex={topicIndex}
      itemIndex={itemIndex}
      detailIndex={detailIndex}
      onDropMedia={onMoveMediaDrop}
      onDropTopic={onMoveStructureDrop}
      onDropItem={onMoveStructureDrop}
      onDropDetail={onMoveStructureDrop}
      acceptTypes={[DRAG_TYPES.MEDIA, DRAG_TYPES.TOPIC, DRAG_TYPES.ITEM, DRAG_TYPES.DETAIL]}
      hasContent={detail.media?.length > 0 || detail.non_conformities?.length > 0}
    >
      <DraggableDetail
        detail={detail}
        topicIndex={topicIndex}
        itemIndex={itemIndex}
        detailIndex={detailIndex}
        onReorder={onReorderDetail}
        onDuplicate={onDuplicateDetail}
        onRemove={onRemoveDetail}
      >
        <Card key={detailIndex} className="border-l-4 border-l-green-300">
        <CardHeader className="py-2 px-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              {detail.name}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onRemoveDetail(topicIndex, itemIndex, detailIndex)}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => onAddNonConformity(topicIndex, itemIndex, detailIndex)}
              >
                <AlertTriangle className="mr-1 h-3 w-3" />
                <span className="text-xs">NC</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      <CardContent className="space-y-3 py-2">
        <div>
          <Label className="text-xs">Nome do Detalhe</Label>
          <Input
            value={detail.name}
            onChange={e => onUpdateDetail(topicIndex, itemIndex, detailIndex, 'name', e.target.value)}
            className="h-7 text-sm mt-1"
          />
        </div>

        <div>
          <Label className="text-xs">Valor</Label>
          <Input
            value={detail.value || ''}
            onChange={e => onUpdateDetail(topicIndex, itemIndex, detailIndex, 'value', e.target.value)}
            className="h-7 text-sm mt-1"
            placeholder="Digite o valor"
          />
        </div>

        <div>
          <Label className="text-xs">Observação do Detalhe</Label>
          <Textarea
            value={detail.observation || ''}
            onChange={e => onUpdateDetail(topicIndex, itemIndex, detailIndex, 'observation', e.target.value)}
            rows={2}
            className="text-sm mt-1"
          />
        </div>

        {/* Media Section */}
        <UniversalMediaSection
          media={detail.media || []}
          level="detail"
          topicIndex={topicIndex}
          itemIndex={itemIndex}
          detailIndex={detailIndex}
          onUpload={onUploadMedia}
          onRemove={onRemoveMedia}
          onMove={onMoveMedia}
          onView={onViewMedia}
          onMoveMediaDrop={onMoveMediaDrop}
          title="Mídia do Detalhe"
        />

        {/* Non-Conformities Section */}
        {detail.non_conformities && detail.non_conformities.length > 0 && (
          <NonConformityEditor
            nonConformities={detail.non_conformities}
            topicIndex={topicIndex}
            itemIndex={itemIndex}
            detailIndex={detailIndex}
            onRemoveNC={onRemoveNonConformity}
            onUpdateNC={onUpdateNonConformity}
            onUploadMedia={onUploadMedia}
            onRemoveMedia={onRemoveMedia}
            onMoveMedia={onMoveMedia}
            onViewMedia={onViewMedia}
            onMoveMediaDrop={onMoveMediaDrop}
          />
        )}
        </CardContent>
        </Card>
      </DraggableDetail>
    </UniversalDropZone>
  );
}