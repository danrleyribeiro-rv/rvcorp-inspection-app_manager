// src/components/inspection/DetailEditor.jsx
"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Trash2 } from "lucide-react";
import MediaSection from "./MediaSection";
import NonConformityEditor from "./NonConformityEditor";

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
  onMoveMediaDrop
}) {
  return (
    <Card key={detailIndex} className="border-l-4 border-l-green-300">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium flex items-center gap-2">
            {detail.name}
            {detail.is_damaged && (
              <Badge variant="destructive" className="text-xs">Danificado</Badge>
            )}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Nome do Detalhe</Label>
            <Input
              value={detail.name}
              onChange={e => onUpdateDetail(topicIndex, itemIndex, detailIndex, 'name', e.target.value)}
              className="h-7 text-sm mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select
              value={detail.type}
              onValueChange={value => onUpdateDetail(topicIndex, itemIndex, detailIndex, 'type', value)}
            >
              <SelectTrigger className="h-7 text-sm mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Texto</SelectItem>
                <SelectItem value="number">Número</SelectItem>
                <SelectItem value="select">Seleção</SelectItem>
                <SelectItem value="boolean">Sim/Não</SelectItem>
                <SelectItem value="image">Imagem</SelectItem>
                <SelectItem value="video">Vídeo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mt-5">
              <Switch
                id={`required-${topicIndex}-${itemIndex}-${detailIndex}`}
                checked={detail.required}
                onCheckedChange={checked => onUpdateDetail(topicIndex, itemIndex, detailIndex, 'required', checked)}
                className="scale-75"
              />
              <Label htmlFor={`required-${topicIndex}-${itemIndex}-${detailIndex}`} className="text-xs">Obrigatório</Label>
            </div>
            <div className="flex items-center gap-2 mt-5">
              <Switch
                id={`damaged-${topicIndex}-${itemIndex}-${detailIndex}`}
                checked={detail.is_damaged}
                onCheckedChange={checked => onUpdateDetail(topicIndex, itemIndex, detailIndex, 'is_damaged', checked)}
                className="scale-75"
              />
              <Label htmlFor={`damaged-${topicIndex}-${itemIndex}-${detailIndex}`} className="text-xs">Danificado</Label>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs">Valor</Label>
          {detail.type === 'boolean' ? (
            <Select
              value={detail.value || ''}
              onValueChange={value => onUpdateDetail(topicIndex, itemIndex, detailIndex, 'value', value)}
            >
              <SelectTrigger className="h-7 text-sm mt-1">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
          ) : detail.type === 'select' && detail.options ? (
            <Select
              value={detail.value || ''}
              onValueChange={value => onUpdateDetail(topicIndex, itemIndex, detailIndex, 'value', value)}
            >
              <SelectTrigger className="h-7 text-sm mt-1">
                <SelectValue placeholder="Selecione uma opção" />
              </SelectTrigger>
              <SelectContent>
                {detail.options.map((option, optIndex) => (
                  <SelectItem key={optIndex} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={detail.value || ''}
              onChange={e => onUpdateDetail(topicIndex, itemIndex, detailIndex, 'value', e.target.value)}
              type={detail.type === 'number' ? 'number' : 'text'}
              className="h-7 text-sm mt-1"
            />
          )}
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
        <MediaSection
          media={detail.media || []}
          topicIndex={topicIndex}
          itemIndex={itemIndex}
          detailIndex={detailIndex}
          onUpload={onUploadMedia}
          onRemove={onRemoveMedia}
          onMove={onMoveMedia}
          onView={onViewMedia}
          onMoveMediaDrop={onMoveMediaDrop}
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
  );
}