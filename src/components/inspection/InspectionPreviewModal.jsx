// src/components/inspection/InspectionPreviewModal.jsx
"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Eye, 
  Download, 
  ArrowRight, 
  Clock, 
  FileText, 
  Layers, 
  AlertTriangle,
  CheckCircle,
  Info,
  GitPullRequest,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useInspectionVersioning } from "@/hooks/use-inspection-versioning";

export default function InspectionPreviewModal({ 
  open, 
  onClose, 
  inspectionId, 
  onPullConfirmed 
}) {
  const [pullNotes, setPullNotes] = useState('');
  
  const {
    loading,
    previewData,
    generatePreview,
    pullInspection
  } = useInspectionVersioning(inspectionId);

  const [pulling, setPulling] = useState(false);

  useEffect(() => {
    if (open && inspectionId) {
      generatePreview();
    }
  }, [open, inspectionId, generatePreview]);

  const handlePull = async () => {
    setPulling(true);
    try {
      const result = await pullInspection(pullNotes);
      if (result) {
        onPullConfirmed?.();
        onClose();
      }
    } finally {
      setPulling(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const dateObj = date?.toDate ? date.toDate() : new Date(date);
      return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
      return 'N/A';
    }
  };

  const renderChangesBadge = (changes) => {
    if (!changes) return null;
    
    const { totalChanges, hasGeneralChanges, hasStructureChanges } = changes.summary;
    
    if (totalChanges === 0) {
      return <Badge variant="outline" className="text-green-600">Sem alterações</Badge>;
    }
    
    return (
      <div className="flex gap-2">
        <Badge variant="destructive">{totalChanges} alterações</Badge>
        {hasGeneralChanges && <Badge variant="outline">Informações Gerais</Badge>}
        {hasStructureChanges && <Badge variant="outline">Estrutura</Badge>}
      </div>
    );
  };

  const renderStructureOverview = (topics) => {
    if (!topics || topics.length === 0) {
      return <p className="text-muted-foreground">Nenhum tópico definido</p>;
    }

    return (
      <div className="space-y-3">
        {topics.slice(0, 3).map((topic, index) => {
          // Calcular detalhes considerando estrutura direta ou tradicional
          let totalDetails = 0;
          if (topic.direct_details && topic.details) {
            // Estrutura direta: tópico → detalhes
            totalDetails = topic.details.length;
          } else if (topic.items) {
            // Estrutura tradicional: tópico → itens → detalhes
            totalDetails = topic.items.reduce((acc, item) => acc + (item.details?.length || 0), 0);
          }

          return (
            <div key={index} className="border rounded-lg p-3">
              <div className="font-medium">{topic.name || topic.title || `Tópico ${index + 1}`}</div>
              {topic.description && (
                <div className="text-xs text-muted-foreground mt-1">{topic.description}</div>
              )}
              <div className="text-sm text-muted-foreground mt-2">
                {topic.direct_details ? (
                  // Estrutura direta
                  <span>{totalDetails} detalhes</span>
                ) : (
                  // Estrutura tradicional
                  <span>
                    {topic.items?.length || 0} itens • {totalDetails} detalhes
                  </span>
                )}
              </div>
              {topic.observation && (
                <div className="text-xs text-muted-foreground mt-1 italic">
                  Obs: {topic.observation.substring(0, 50)}...
                </div>
              )}
            </div>
          );
        })}
        {topics.length > 3 && (
          <div className="text-sm text-muted-foreground text-center py-2">
            ... e mais {topics.length - 3} tópicos
          </div>
        )}
      </div>
    );
  };

  const renderGeneralChanges = (changes) => {
    if (!changes?.general) return null;
    
    const changedFields = Object.entries(changes.general).filter(([_, data]) => data.changed);
    
    if (changedFields.length === 0) {
      return <p className="text-muted-foreground">Nenhuma alteração nas informações gerais</p>;
    }

    return (
      <div className="space-y-3">
        {changedFields.map(([field, data]) => (
          <div key={field} className="border rounded-lg p-3">
            <div className="font-medium capitalize mb-2">{field === 'title' ? 'Título' : field === 'area' ? 'Área' : 'Observação'}</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">Versão atual:</div>
                <div className="bg-red-50 p-2 rounded border-l-2 border-red-200">
                  {data.original || 'Vazio'}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Nova versão:</div>
                <div className="bg-green-50 p-2 rounded border-l-2 border-green-200">
                  {data.updated || 'Vazio'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Carregando Preview</DialogTitle>
            <DialogDescription>
              Aguarde enquanto carregamos os dados da inspeção...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!previewData) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Erro ao carregar Preview</DialogTitle>
            <DialogDescription>
              Não foi possível carregar os dados da inspeção.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const { original, current, isFirstPull, changes, statistics } = previewData;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <GitPullRequest className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {isFirstPull ? 'Primeira Importação' : 'Atualizar Inspeção'}
              </DialogTitle>
              <DialogDescription>
                {isFirstPull 
                  ? 'Importar dados da inspeção para sua versão de gerenciamento'
                  : 'Visualize as alterações antes de atualizar sua versão'
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Status da Inspeção */}
          <div className="mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {original.title || 'Inspeção sem título'}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Atualizada em {formatDate(original.updated_at)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Layers className="h-4 w-4" />
                    {statistics.totalTopics} tópicos, {statistics.totalItems} itens, {statistics.totalDetails} detalhes
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-3">
                  {isFirstPull ? (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Esta é a primeira importação desta inspeção.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="flex items-center gap-3">
                      {renderChangesBadge(changes)}
                      {current && (
                        <div className="text-sm text-muted-foreground">
                          Sua versão atual: v{current.version} • {formatDate(current.pulled_at)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <ScrollArea className="h-[400px]">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className={`grid w-full ${!isFirstPull ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="general">Informações Gerais</TabsTrigger>
                {!isFirstPull && <TabsTrigger value="structure">Estrutura</TabsTrigger>}
                <TabsTrigger value="changes">Alterações</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-blue-600">{statistics.totalTopics}</div>
                      <p className="text-sm text-muted-foreground">Tópicos</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-green-600">{statistics.totalItems}</div>
                      <p className="text-sm text-muted-foreground">Itens</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-purple-600">{statistics.totalDetails}</div>
                      <p className="text-sm text-muted-foreground">Detalhes</p>
                    </CardContent>
                  </Card>
                </div>
                
                {original.area && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Área da Inspeção</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold">{original.area}</p>
                    </CardContent>
                  </Card>
                )}
                
                {original.observation && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Observações</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{original.observation}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Título</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{original.title || 'Não definido'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Área</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{original.area || 'Não definida'}</p>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Endereço da Inspeção */}
                {(original.address || original.city || original.state || original.postal_code) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Endereço da Inspeção</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {original.address && (
                          <p>
                            <span className="font-medium">Logradouro: </span>
                            {original.address}
                            {original.number && `, ${original.number}`}
                            {original.complement && ` - ${original.complement}`}
                          </p>
                        )}
                        {original.neighborhood && (
                          <p>
                            <span className="font-medium">Bairro: </span>
                            {original.neighborhood}
                          </p>
                        )}
                        <div className="flex gap-4">
                          {original.city && (
                            <p>
                              <span className="font-medium">Cidade: </span>
                              {original.city}
                            </p>
                          )}
                          {original.state && (
                            <p>
                              <span className="font-medium">Estado: </span>
                              {original.state}
                            </p>
                          )}
                        </div>
                        {original.postal_code && (
                          <p>
                            <span className="font-medium">CEP: </span>
                            {original.postal_code}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {original.observation && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Observações</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{original.observation}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {!isFirstPull && (
                <TabsContent value="structure" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Estrutura da Inspeção</CardTitle>
                      <CardDescription>
                        Estrutura importada na sua versão de gerenciamento
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {current?.topics ? renderStructureOverview(current.topics) : (
                        <p className="text-muted-foreground">Nenhuma estrutura importada encontrada</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              <TabsContent value="changes" className="space-y-4 mt-4">
                {isFirstPull ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Esta é a primeira importação, portanto não há alterações para comparar.
                    </AlertDescription>
                  </Alert>
                ) : changes?.summary.totalChanges > 0 ? (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Alterações nas Informações Gerais</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {renderGeneralChanges(changes)}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Não há alterações detectadas desde a última importação.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </div>

        <Separator />

        <DialogFooter>
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Notas da importação (opcional)"
                value={pullNotes}
                onChange={(e) => setPullNotes(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={pulling}>
                Cancelar
              </Button>
              <Button onClick={handlePull} disabled={pulling}>
                {pulling ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {isFirstPull ? 'Importando...' : 'Atualizando...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    {isFirstPull ? 'Importar Inspeção' : 'Atualizar Versão'}
                  </div>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}