// src/components/inspection/DetailEditor.jsx
"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Trash2, GripVertical, Copy } from "lucide-react";
import NonConformityEditor from "./NonConformityEditor";
import { UniversalDropZone, DRAG_TYPES } from "./EnhancedDragDropProvider";
import { DraggableDetail } from "./DraggableStructureItem";
import { Switch } from "@/components/ui/switch";

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
  const renderFormField = () => {
    switch (detail.type) {
      case 'select':
        return (
          <div>
            <Label className="text-xs">Valor</Label>
            <select
              value={detail.value || ''}
              onChange={e => onUpdateDetail(topicIndex, itemIndex, detailIndex, 'value', e.target.value)}
              className="w-full h-7 text-sm mt-1 px-2 border rounded"
            >
              <option value="">Selecione...</option>
              {detail.options?.map((option, idx) => (
                <option key={idx} value={option}>{option}</option>
              ))}
            </select>
          </div>
        );
      
      case 'boolean':
        return (
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Valor</Label>
            <div className="flex items-center gap-2 mt-1">
              <Switch
                checked={detail.value === true || detail.value === 'true'}
                onCheckedChange={checked => onUpdateDetail(topicIndex, itemIndex, detailIndex, 'value', checked)}
                id={`switch-${topicIndex}-${itemIndex}-${detailIndex}`}
              />
              <span className="text-xs">{detail.value === true || detail.value === 'true' ? 'Sim' : 'Não'}</span>
            </div>
          </div>
        );
      
      case 'measure':
        return (
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Medidas (Altura, Largura, Profundidade)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="number"
                placeholder="Altura"
                value={detail.value?.altura || ''}
                onChange={e => onUpdateDetail(topicIndex, itemIndex, detailIndex, 'value', { ...detail.value, altura: e.target.value })}
                className="h-7 text-sm w-1/3"
                min="0"
                step="any"
              />
              <Input
                type="number"
                placeholder="Largura"
                value={detail.value?.largura || ''}
                onChange={e => onUpdateDetail(topicIndex, itemIndex, detailIndex, 'value', { ...detail.value, largura: e.target.value })}
                className="h-7 text-sm w-1/3"
                min="0"
                step="any"
              />
              <Input
                type="number"
                placeholder="Profundidade"
                value={detail.value?.profundidade || ''}
                onChange={e => onUpdateDetail(topicIndex, itemIndex, detailIndex, 'value', { ...detail.value, profundidade: e.target.value })}
                className="h-7 text-sm w-1/3"
                min="0"
                step="any"
              />
            </div>
            <span className="text-xs text-muted-foreground">Preencha qualquer uma das medidas.</span>
          </div>
        );
      case 'text':
      default:
        return (
          <div>
            <Label className="text-xs">Valor</Label>
            <Input
              value={detail.value || ''}
              onChange={e => onUpdateDetail(topicIndex, itemIndex, detailIndex, 'value', e.target.value)}
              className="h-7 text-sm mt-1"
              placeholder="Digite o valor"
            />
          </div>
        );
    }
  };

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
      hasContent={detail.non_conformities?.length > 0}
    >
      <DraggableDetail
        detail={detail}
        topicIndex={topicIndex}
        itemIndex={itemIndex}
        detailIndex={detailIndex}
        onReorder={onReorderDetail}
        onDuplicate={onDuplicateDetail}
      >
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                <h4 className="font-medium text-sm">{detail.name}</h4>
                {detail.required && (
                  <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                )}
                {detail.is_damaged && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Danos
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDuplicateDetail(topicIndex, itemIndex, detailIndex)}
                  className="h-7 w-7 p-0"
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddNonConformity(topicIndex, itemIndex, detailIndex)}
                  className="h-7 px-2 text-xs"
                >
                  + NC
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveDetail(topicIndex, itemIndex, detailIndex)}
                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0 space-y-3">
            {renderFormField()}

            <div>
              <Label className="text-xs">Observação do Detalhe</Label>
              <Textarea
                value={detail.observation || ''}
                onChange={e => onUpdateDetail(topicIndex, itemIndex, detailIndex, 'observation', e.target.value)}
                rows={2}
                className="text-sm mt-1"
              />
            </div>

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