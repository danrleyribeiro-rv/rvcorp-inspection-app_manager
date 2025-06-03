// src/components/inspection/NonConformityEditor.jsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Trash2, Upload } from "lucide-react";
import DraggableMedia from "./DraggableMedia";
import MediaDropzone from "./MediaDropzone";

export default function NonConformityEditor({ 
  nonConformities, 
  topicIndex, 
  itemIndex, 
  detailIndex, 
  onRemoveNC, 
  onUpdateNC, 
  onUploadMedia,
  onRemoveMedia,
  onMoveMedia,
  onViewMedia,
  onMoveMediaDrop
}) {
  const getSeverityColor = (severity) => {
    const colors = {
      'Baixa': 'bg-green-100 text-green-800',
      'Média': 'bg-yellow-100 text-yellow-800',
      'Alta': 'bg-red-100 text-red-800',
      'Crítica': 'bg-red-600 text-white'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      'pendente': 'bg-yellow-100 text-yellow-800',
      'em_andamento': 'bg-blue-100 text-blue-800',
      'resolvida': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-2 mt-1">
      {nonConformities && nonConformities.length > 0 ? (
        <>
          <Label className="text-xs font-bold">
            Não Conformidades ({nonConformities.length})
          </Label>
          <div className="space-y-2">
            {nonConformities.map((nc, ncIndex) => (
              <Card key={ncIndex} className="border-l-4 border-l-red-300">
                <CardHeader className="py-2 px-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs">
                      <Badge className={`text-xs py-0 px-1 ${getSeverityColor(nc.severity)}`}>
                        {nc.severity}
                      </Badge>
                      <Badge className={`text-xs py-0 px-1 ${getStatusColor(nc.status)}`}>
                        {nc.status === 'pendente' && 'Pendente'}
                        {nc.status === 'em_andamento' && 'Em Andamento'}
                        {nc.status === 'resolvida' && 'Resolvida'}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => onRemoveNC(topicIndex, itemIndex, detailIndex, ncIndex)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 py-2">
                  <div>
                    <Label className="text-xs font-bold">Descrição</Label>
                    <Textarea
                      value={nc.description || ''}
                      onChange={e => onUpdateNC(topicIndex, itemIndex, detailIndex, ncIndex, 'description', e.target.value)}
                      rows={1}
                      className="text-sm mt-1"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-bold">Severidade</Label>
                      <Select
                        value={nc.severity}
                        onValueChange={value => onUpdateNC(topicIndex, itemIndex, detailIndex, ncIndex, 'severity', value)}
                      >
                        <SelectTrigger className="h-7 text-sm mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Baixa">Baixa</SelectItem>
                          <SelectItem value="Média">Média</SelectItem>
                          <SelectItem value="Alta">Alta</SelectItem>
                          <SelectItem value="Crítica">Crítica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Status</Label>
                      <Select
                        value={nc.status}
                        onValueChange={value => onUpdateNC(topicIndex, itemIndex, detailIndex, ncIndex, 'status', value)}
                      >
                        <SelectTrigger className="h-7 text-sm mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="em_andamento">Em Andamento</SelectItem>
                          <SelectItem value="resolvida">Resolvida</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs font-bold">Ação Corretiva</Label>
                    <Textarea
                      value={nc.corrective_action || ''}
                      onChange={e => onUpdateNC(topicIndex, itemIndex, detailIndex, ncIndex, 'corrective_action', e.target.value)}
                      rows={1}
                      className="text-sm mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs font-bold">Prazo</Label>
                    <Input
                      type="date"
                      value={nc.deadline ? nc.deadline.split('T')[0] : ''}
                      onChange={e => onUpdateNC(
                        topicIndex, 
                        itemIndex, 
                        detailIndex, 
                        ncIndex, 
                        'deadline', 
                        e.target.value ? `${e.target.value}T00:00:00.000` : null
                      )}
                      className="h-7 text-sm mt-1"
                    />
                  </div>

                  {/* NC Media Section */}
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Mídia da NC ({nc.media?.length || 0})</Label>
                      <div>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={e => {
                            const file = e.target.files[0];
                            if (file) {
                              onUploadMedia(topicIndex, itemIndex, detailIndex, file, true, ncIndex);
                            }
                            e.target.value = '';
                          }}
                          style={{ display: 'none' }}
                          id={`nc-media-upload-${topicIndex}-${itemIndex}-${detailIndex}-${ncIndex}`}
                        />
                        <Button
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => document.getElementById(
                            `nc-media-upload-${topicIndex}-${itemIndex}-${detailIndex}-${ncIndex}`
                          ).click()}
                        >
                          <Upload className="mr-1 h-3 w-3" />
                          Mídia
                        </Button>
                      </div>
                    </div>
                    
                    <MediaDropzone
                      topicIndex={topicIndex}
                      itemIndex={itemIndex}
                      detailIndex={detailIndex}
                      ncIndex={ncIndex}
                      onDrop={onMoveMediaDrop}
                      hasMedia={nc.media && nc.media.length > 0}
                    >
                      {nc.media && nc.media.length > 0 ? (
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-1 mt-1">
                          {nc.media.map((media, mediaIndex) => (
                            <DraggableMedia
                              key={mediaIndex}
                              media={media}
                              topicIndex={topicIndex}
                              itemIndex={itemIndex}
                              detailIndex={detailIndex}
                              mediaIndex={mediaIndex}
                              isNC={true}
                              ncIndex={ncIndex}
                              onView={onViewMedia}
                              onRemove={onRemoveMedia}
                              onMove={onMoveMedia}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="border-2 border-dashed rounded-md p-2 min-h-[60px] flex items-center justify-center text-xs text-muted-foreground mt-1">
                          Arraste uma mídia para cá ou clique no botão acima
                        </div>
                      )}
                    </MediaDropzone>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center py-2 border rounded-md text-sm text-muted-foreground">
          <AlertTriangle className="mr-2 h-4 w-4" />
          Nenhuma não conformidade registrada
        </div>
      )}
    </div>
  );
}