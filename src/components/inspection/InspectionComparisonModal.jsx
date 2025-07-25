// src/components/inspection/InspectionComparisonModal.jsx
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Eye, 
  GitCompare,
  ArrowRight, 
  Clock, 
  FileText, 
  Layers, 
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useInspectionVersioning } from "@/hooks/use-inspection-versioning";
import { getInternalStatus, getInternalStatusText } from "@/utils/inspection-status";

export default function InspectionComparisonModal({ 
  open, 
  onClose, 
  inspectionId,
  pullHistory,
  currentVersion,
  changeInfo
}) {
  const [selectedVersion1, setSelectedVersion1] = useState('');
  const [selectedVersion2, setSelectedVersion2] = useState('');
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const {
    getVersionSnapshot,
    generatePreview
  } = useInspectionVersioning(inspectionId);

  // Auto-selecionar versões quando o modal abre
  useEffect(() => {
    if (open && pullHistory.length > 0) {
      // Versão 1: versão atual
      if (currentVersion) {
        setSelectedVersion1(currentVersion.version.toString());
      }
      
      // Versão 2: versão original se houver mudanças, senão a anterior
      if (changeInfo?.hasChanges) {
        setSelectedVersion2('original');
      } else if (pullHistory.length > 1) {
        setSelectedVersion2(pullHistory[1].version.toString());
      }
    }
  }, [open, pullHistory, currentVersion, changeInfo]);

  const handleCompare = async () => {
    if (!selectedVersion1 || !selectedVersion2) return;
    
    setLoading(true);
    try {
      let data1, data2;
      
      console.log('Iniciando comparação:', { selectedVersion1, selectedVersion2 });
      
      // Buscar dados da versão 1
      if (selectedVersion1 === 'original') {
        console.log('Buscando versão original para v1...');
        const previewData = await generatePreview();
        data1 = previewData?.original || previewData;
        console.log('Dados v1 (original):', data1);
      } else {
        console.log('Buscando snapshot para v1:', selectedVersion1);
        data1 = await getVersionSnapshot(parseInt(selectedVersion1));
        console.log('Dados v1 (snapshot):', data1);
      }
      
      // Buscar dados da versão 2
      if (selectedVersion2 === 'original') {
        console.log('Buscando versão original para v2...');
        const previewData = await generatePreview();
        data2 = previewData?.original || previewData;
        console.log('Dados v2 (original):', data2);
      } else {
        console.log('Buscando snapshot para v2:', selectedVersion2);
        data2 = await getVersionSnapshot(parseInt(selectedVersion2));
        console.log('Dados v2 (snapshot):', data2);
      }
      
      console.log('Configurando dados de comparação:', { data1, data2 });
      setComparisonData({ version1: data1, version2: data2 });
    } catch (error) {
      console.error('Erro ao comparar versões:', error);
      // Mostrar erro para o usuário
      alert('Erro ao buscar dados das versões: ' + error.message);
    } finally {
      setLoading(false);
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

  const getVersionOptions = () => {
    const options = [
      { value: 'original', label: 'Versão Original (Lince)' }
    ];
    
    pullHistory.forEach(entry => {
      options.push({
        value: entry.version.toString(),
        label: `v${entry.version} - ${formatDate(entry.pulled_at)}`
      });
    });
    
    return options;
  };

  // Função para detectar diferenças profundas
  const detectDifferences = (v1, v2) => {
    const differences = [];
    
    console.log('Comparando versões:', { v1, v2 });
    
    if (!v1 || !v2) {
      if (!v1 && !v2) return differences;
      
      // Uma das versões está vazia
      differences.push({
        type: 'general',
        field: 'Disponibilidade de dados',
        path: 'root',
        old: v2 ? 'Dados disponíveis' : 'Sem dados',
        new: v1 ? 'Dados disponíveis' : 'Sem dados'
      });
      return differences;
    }

    // Comparar campos básicos com verificação de tipos
    const basicFields = [
      { key: 'title', label: 'Título' },
      { key: 'area', label: 'Área' },
      { key: 'observation', label: 'Observações' },
      { key: 'status', label: 'Status' }
    ];

    basicFields.forEach(field => {
      const val1 = v1[field.key];
      const val2 = v2[field.key];
      
      // Converter valores para string para comparação consistente
      const str1 = val1 === null || val1 === undefined ? '' : String(val1);
      const str2 = val2 === null || val2 === undefined ? '' : String(val2);
      
      if (str1 !== str2) {
        differences.push({
          type: 'field',
          field: field.label,
          path: field.key,
          old: str2 || '(vazio)',
          new: str1 || '(vazio)'
        });
      }
    });

    // Comparar tópicos com análise profunda
    const topics1 = Array.isArray(v1.topics) ? v1.topics : [];
    const topics2 = Array.isArray(v2.topics) ? v2.topics : [];

    console.log('Comparando tópicos:', { topics1: topics1.length, topics2: topics2.length });

    if (topics1.length !== topics2.length) {
      differences.push({
        type: 'count',
        field: 'Número de Tópicos',
        path: 'topics.length',
        old: topics2.length,
        new: topics1.length
      });
    }

    // Comparar cada tópico em detalhes
    const maxTopics = Math.max(topics1.length, topics2.length);
    for (let i = 0; i < maxTopics; i++) {
      const topic1 = topics1[i];
      const topic2 = topics2[i];

      if (!topic1 && topic2) {
        differences.push({
          type: 'removed',
          field: `Tópico "${topic2.name || `Tópico ${i + 1}`}"`,
          path: `topics[${i}]`,
          old: `Existia: ${topic2.name || `Tópico ${i + 1}`}`,
          new: 'Removido'
        });
      } else if (topic1 && !topic2) {
        differences.push({
          type: 'added',
          field: `Tópico "${topic1.name || `Tópico ${i + 1}`}"`,
          path: `topics[${i}]`,
          old: 'Não existia',
          new: `Adicionado: ${topic1.name || `Tópico ${i + 1}`}`
        });
      } else if (topic1 && topic2) {
        const topicName = topic1.name || topic2.name || `Tópico ${i + 1}`;
        
        // Comparar nome do tópico
        if (String(topic1.name || '') !== String(topic2.name || '')) {
          differences.push({
            type: 'field',
            field: `Nome do ${topicName}`,
            path: `topics[${i}].name`,
            old: topic2.name || '(sem nome)',
            new: topic1.name || '(sem nome)'
          });
        }

        // Comparar observações do tópico
        const obs1 = String(topic1.observation || '').trim();
        const obs2 = String(topic2.observation || '').trim();
        if (obs1 !== obs2) {
          differences.push({
            type: 'field',
            field: `Observações de "${topicName}"`,
            path: `topics[${i}].observation`,
            old: obs2 || '(sem observações)',
            new: obs1 || '(sem observações)'
          });
        }

        // Comparar mídia do tópico
        const media1 = Array.isArray(topic1.media) ? topic1.media : [];
        const media2 = Array.isArray(topic2.media) ? topic2.media : [];
        if (media1.length !== media2.length) {
          differences.push({
            type: 'count',
            field: `Mídia de "${topicName}"`,
            path: `topics[${i}].media.length`,
            old: `${media2.length} arquivo(s)`,
            new: `${media1.length} arquivo(s)`
          });
        }

        // Comparar itens se existirem
        const items1 = Array.isArray(topic1.items) ? topic1.items : [];
        const items2 = Array.isArray(topic2.items) ? topic2.items : [];
        
        if (items1.length !== items2.length) {
          differences.push({
            type: 'count',
            field: `Itens de "${topicName}"`,
            path: `topics[${i}].items.length`,
            old: `${items2.length} item(s)`,
            new: `${items1.length} item(s)`
          });
        }

        // Análise detalhada de itens
        const maxItems = Math.max(items1.length, items2.length);
        for (let j = 0; j < maxItems; j++) {
          const item1 = items1[j];
          const item2 = items2[j];
          
          if (!item1 && item2) {
            differences.push({
              type: 'removed',
              field: `Item "${item2.name || `Item ${j + 1}`}" em "${topicName}"`,
              path: `topics[${i}].items[${j}]`,
              old: `Existia: ${item2.name || `Item ${j + 1}`}`,
              new: 'Removido'
            });
          } else if (item1 && !item2) {
            differences.push({
              type: 'added',
              field: `Item "${item1.name || `Item ${j + 1}`}" em "${topicName}"`,
              path: `topics[${i}].items[${j}]`,
              old: 'Não existia',
              new: `Adicionado: ${item1.name || `Item ${j + 1}`}`
            });
          } else if (item1 && item2) {
            const itemName = item1.name || item2.name || `Item ${j + 1}`;
            
            // Comparar nome do item
            if (String(item1.name || '') !== String(item2.name || '')) {
              differences.push({
                type: 'field',
                field: `Nome do item "${itemName}" em "${topicName}"`,
                path: `topics[${i}].items[${j}].name`,
                old: item2.name || '(sem nome)',
                new: item1.name || '(sem nome)'
              });
            }
            
            // Comparar detalhes do item
            const details1 = Array.isArray(item1.details) ? item1.details : [];
            const details2 = Array.isArray(item2.details) ? item2.details : [];
            
            if (details1.length !== details2.length) {
              differences.push({
                type: 'count',
                field: `Detalhes de "${itemName}" em "${topicName}"`,
                path: `topics[${i}].items[${j}].details.length`,
                old: `${details2.length} detalhe(s)`,
                new: `${details1.length} detalhe(s)`
              });
            }
          }
        }

        // Comparar detalhes diretos do tópico (se não há itens)
        if (!topic1.items && !topic2.items) {
          const details1 = Array.isArray(topic1.details) ? topic1.details : [];
          const details2 = Array.isArray(topic2.details) ? topic2.details : [];
          
          if (details1.length !== details2.length) {
            differences.push({
              type: 'count',
              field: `Detalhes diretos de "${topicName}"`,
              path: `topics[${i}].details.length`,
              old: `${details2.length} detalhe(s)`,
              new: `${details1.length} detalhe(s)`
            });
          }
        }
      }
    }

    console.log('Diferenças encontradas:', differences);
    return differences;
  };

  const renderComparison = () => {
    if (!comparisonData) return null;

    const { version1, version2 } = comparisonData;
    const differences = detectDifferences(version1, version2);
    
    return (
      <div className="space-y-4">
        {/* Resumo das Versões */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {selectedVersion1 === 'original' ? 'Versão Original (Lince)' : `Versão ${selectedVersion1}`}
                {version1?._isCurrentDataFallback && (
                  <Badge variant="secondary" className="text-xs">
                    Dados Atuais*
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Título:</span>
                  <span className="font-medium truncate max-w-32" title={version1?.title}>
                    {version1?.title || '(sem título)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tópicos:</span>
                  <span className="font-medium">{version1?.topics?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline">{getInternalStatusText(getInternalStatus(version1)) || '(sem status)'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Atualização:</span>
                  <span className="text-xs">{formatDate(version1?.updated_at)}</span>
                </div>
              </div>
              {version1?._isCurrentDataFallback && (
                <div className="mt-2 p-2 bg-yellow-50 border-l-2 border-yellow-200 text-xs text-yellow-700">
                  * Usando dados atuais como referência (snapshot histórico não disponível)
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {selectedVersion2 === 'original' ? 'Versão Original (Lince)' : `Versão ${selectedVersion2}`}
                {version2?._isCurrentDataFallback && (
                  <Badge variant="secondary" className="text-xs">
                    Dados Atuais*
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Título:</span>
                  <span className="font-medium truncate max-w-32" title={version2?.title}>
                    {version2?.title || '(sem título)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tópicos:</span>
                  <span className="font-medium">{version2?.topics?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline">{getInternalStatusText(getInternalStatus(version2)) || '(sem status)'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Atualização:</span>
                  <span className="text-xs">{formatDate(version2?.updated_at)}</span>
                </div>
              </div>
              {version2?._isCurrentDataFallback && (
                <div className="mt-2 p-2 bg-yellow-50 border-l-2 border-yellow-200 text-xs text-yellow-700">
                  * Usando dados atuais como referência (snapshot histórico não disponível)
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Análise Detalhada das Diferenças */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <GitCompare className="h-4 w-4" />
              Análise Detalhada das Diferenças
              <Badge variant={differences.length > 0 ? "destructive" : "default"}>
                {differences.length} diferença{differences.length !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {differences.length === 0 ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Nenhuma diferença encontrada!</strong> As versões selecionadas são idênticas.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {differences.map((diff, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-slate-50">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {diff.type === 'added' && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                        {diff.type === 'removed' && <div className="w-2 h-2 bg-red-500 rounded-full"></div>}
                        {diff.type === 'field' && <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>}
                        {diff.type === 'count' && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm mb-1">{diff.field}</div>
                        <div className="text-xs text-muted-foreground mb-2">
                          Caminho: <code className="bg-slate-200 px-1 rounded">{diff.path}</code>
                        </div>
                        
                        {diff.type === 'added' && (
                          <div className="space-y-1">
                            <div className="text-green-700 text-sm">
                              ✅ <strong>Adicionado:</strong> {diff.new}
                            </div>
                          </div>
                        )}
                        
                        {diff.type === 'removed' && (
                          <div className="space-y-1">
                            <div className="text-red-700 text-sm">
                              ❌ <strong>Removido:</strong> {diff.old}
                            </div>
                          </div>
                        )}
                        
                        {diff.type === 'general' && (
                          <div className="space-y-1">
                            <div className="text-blue-700 text-sm">
                              ℹ️ <strong>Status:</strong> {diff.old} → {diff.new}
                            </div>
                          </div>
                        )}
                        
                        {(diff.type === 'field' || diff.type === 'count') && (
                          <div className="space-y-1">
                            <div className="text-red-700 text-sm bg-red-50 p-2 rounded border-l-2 border-red-200">
                              ➖ <strong>Versão {selectedVersion2 === 'original' ? 'Original' : selectedVersion2}:</strong> {diff.old}
                            </div>
                            <div className="text-green-700 text-sm bg-green-50 p-2 rounded border-l-2 border-green-200">
                              ➕ <strong>Versão {selectedVersion1 === 'original' ? 'Original' : selectedVersion1}:</strong> {diff.new}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Comparar Versões da Inspeção
          </DialogTitle>
          <DialogDescription>
            Compare diferentes versões da inspeção para ver as alterações realizadas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <div className="space-y-4">
            {/* Seletores de Versão */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Versão 1</label>
                <Select value={selectedVersion1} onValueChange={setSelectedVersion1}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma versão" />
                  </SelectTrigger>
                  <SelectContent>
                    {getVersionOptions().map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Versão 2</label>
                <Select value={selectedVersion2} onValueChange={setSelectedVersion2}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma versão" />
                  </SelectTrigger>
                  <SelectContent>
                    {getVersionOptions().map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botão de Comparação */}
            <div className="flex justify-center">
              <Button 
                onClick={handleCompare}
                disabled={!selectedVersion1 || !selectedVersion2 || loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <GitCompare className="h-4 w-4" />
                )}
                {loading ? 'Comparando...' : 'Comparar Versões'}
              </Button>
            </div>

            {/* Resultado da Comparação */}
            <ScrollArea className="h-96">
              {renderComparison()}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}