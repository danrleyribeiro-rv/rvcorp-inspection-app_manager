// src/components/inspection/InspectionVersionControl.jsx
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  GitPullRequest, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Eye,
  History,
  Database,
  FileText,
  Download,
  ChevronDown,
  RotateCcw,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import InspectionPreviewModal from "./InspectionPreviewModal";
import FirestoreSetupAlert from "./FirestoreSetupAlert";
import { useInspectionVersioning } from "@/hooks/use-inspection-versioning";
import { generateInspectionPDF, generateNonConformitiesPDF } from "@/services/pdf-service";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function InspectionVersionControl({ 
  inspectionId, 
  onDataPulled,
  inspection 
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [showSetupAlert, setShowSetupAlert] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [selectedVersionToRestore, setSelectedVersionToRestore] = useState(null);
  const [restoreNotes, setRestoreNotes] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  
  const { toast } = useToast();
  
  const {
    checkingChanges,
    changeInfo,
    pullHistory,
    currentVersion,
    checkForChanges,
    restoreVersion,
    loadPullHistory,
    loadCurrentVersion
  } = useInspectionVersioning(inspectionId);

  // Mostrar alerta de configuração se necessário
  useEffect(() => {
    if (changeInfo?.needsFirestoreSetup) {
      setShowSetupAlert(true);
    }
  }, [changeInfo]);

  const handlePreviewAndPull = () => {
    setShowPreview(true);
  };

  const handlePullConfirmed = () => {
    onDataPulled?.();
  };

  const handleGenerateReport = async (reportGenerator, type) => {
    if (isGeneratingPDF || !inspection) return;
    setIsGeneratingPDF(true);
    
    const { id: toastId, update: updateToast } = toast({
      title: "Gerando PDF...",
      description: "Aguarde enquanto preparamos o seu relatório.",
    });
    
    try {
      const result = await reportGenerator(inspection, null);
      
      updateToast({
        id: toastId,
        title: result.success ? "PDF Gerado com Sucesso!" : "Falha ao Gerar PDF",
        description: result.success ? "O download começará em breve." : result.error,
        variant: result.success ? "success" : "destructive",
      });
    } catch (error) {
      updateToast({
        id: toastId,
        title: "Erro Inesperado",
        description: "Ocorreu um erro inesperado ao gerar o PDF.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleVersionReport = async (versionEntry, reportType) => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    
    const { id: toastId, update: updateToast } = toast({
      title: "Gerando PDF da Versão...",
      description: `Gerando relatório da versão ${versionEntry.version}. Aguarde...`,
    });
    
    try {
      // Get version data from inspections_data collection
      const { db } = await import('@/lib/firebase');
      const { doc, getDoc } = await import('firebase/firestore');
      
      const versionDataRef = doc(db, 'inspections_data', inspectionId);
      const versionDataDoc = await getDoc(versionDataRef);
      
      if (!versionDataDoc.exists()) {
        throw new Error('Dados da versão não encontrados');
      }
      
      const versionData = versionDataDoc.data();
      
      // Choose the report generator based on type
      const reportGenerator = reportType === 'complete' 
        ? generateInspectionPDF 
        : generateNonConformitiesPDF;
      
      const result = await reportGenerator(versionData, null);
      
      updateToast({
        id: toastId,
        title: result.success ? "PDF da Versão Gerado!" : "Falha ao Gerar PDF",
        description: result.success 
          ? `Relatório da versão ${versionEntry.version} baixado com sucesso.` 
          : result.error,
        variant: result.success ? "success" : "destructive",
      });
    } catch (error) {
      updateToast({
        id: toastId,
        title: "Erro ao Gerar PDF da Versão",
        description: error.message || "Ocorreu um erro inesperado ao gerar o PDF da versão.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleRestoreVersion = (version) => {
    setSelectedVersionToRestore(version);
    setRestoreNotes('');
    setShowRestoreDialog(true);
  };

  const confirmRestore = async () => {
    if (!selectedVersionToRestore) return;
    
    setIsRestoring(true);
    try {
      const result = await restoreVersion(selectedVersionToRestore.version, restoreNotes);
      if (result) {
        // Fechar modal
        setShowRestoreDialog(false);
        setSelectedVersionToRestore(null);
        setRestoreNotes('');
        
        // O hook restoreVersion já faz o recarregamento, mas vamos forçar novamente
        // para garantir que a UI seja atualizada imediatamente
        setTimeout(async () => {
          await Promise.all([
            loadPullHistory(),
            loadCurrentVersion(),
            checkForChanges()
          ]);
        }, 100);
        
        // Notificar componente pai
        onDataPulled?.();
      }
    } finally {
      setIsRestoring(false);
    }
  };

  const cancelRestore = () => {
    setShowRestoreDialog(false);
    setSelectedVersionToRestore(null);
    setRestoreNotes('');
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

  const getStatusInfo = () => {
    if (!changeInfo) {
      return {
        status: 'loading',
        title: 'Verificando...',
        description: 'Verificando se há mudanças disponíveis',
        variant: 'secondary',
        icon: RefreshCw
      };
    }

    if (changeInfo.error) {
      return {
        status: 'error',
        title: 'Erro ao verificar',
        description: changeInfo.error,
        variant: 'destructive',
        icon: AlertTriangle
      };
    }

    if (changeInfo.isFirstPull) {
      return {
        status: 'first-pull',
        title: 'Primeira Importação',
        description: 'Esta inspeção ainda não foi importada para sua versão de gerenciamento',
        variant: 'default',
        icon: Database
      };
    }

    if (changeInfo.hasChanges) {
      return {
        status: 'has-changes',
        title: 'Atualizações Disponíveis',
        description: `Última atualização: ${formatDate(changeInfo.originalLastUpdated)}`,
        variant: 'destructive',
        icon: AlertTriangle
      };
    }

    return {
      status: 'up-to-date',
      title: 'Sincronizado',
      description: `Última sincronização: ${formatDate(changeInfo.lastPulled)}`,
      variant: 'secondary',
      icon: CheckCircle
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <>
      <FirestoreSetupAlert 
        show={showSetupAlert}
        onDismiss={() => setShowSetupAlert(false)}
      />
      
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-5 w-5" />
              <CardTitle className="text-lg">Controle de Versão</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={checkForChanges}
              disabled={checkingChanges}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${checkingChanges ? 'animate-spin' : ''}`} />
              Verificar
            </Button>
          </div>
          <CardDescription>
            Sincronize dados da inspeção original para sua versão de gerenciamento
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Status Atual */}
          <Alert variant={statusInfo.variant}>
            <StatusIcon className={`h-4 w-4 ${statusInfo.status === 'loading' ? 'animate-spin' : ''}`} />
            <AlertDescription>
              <div className="font-medium">{statusInfo.title}</div>
              <div className="text-sm mt-1">{statusInfo.description}</div>
            </AlertDescription>
          </Alert>

          {/* Informações da Versão Atual */}
          {currentVersion && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Badge variant="outline">v{currentVersion.version}</Badge>
                <div className="text-sm">
                  <div className="font-medium">Versão Atual</div>
                  <div className="text-muted-foreground">
                    Importada em {formatDate(currentVersion.pulled_at)}
                  </div>
                </div>
              </div>
              {currentVersion.pull_notes && (
                <div className="text-xs text-muted-foreground max-w-xs truncate">
                  "{currentVersion.pull_notes}"
                </div>
              )}
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-2">
            <Button
              onClick={handlePreviewAndPull}
              disabled={checkingChanges}
              variant={changeInfo?.hasChanges || changeInfo?.isFirstPull ? "default" : "outline"}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              {changeInfo?.isFirstPull 
                ? 'Importar Inspeção' 
                : changeInfo?.hasChanges 
                  ? 'Visualizar e Atualizar'
                  : 'Visualizar Dados'
              }
            </Button>
            
            {/* Preview PDFs Dropdown */}
            {inspection && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isGeneratingPDF}
                    className="px-3"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Preview PDF
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => handleGenerateReport(generateInspectionPDF, 'complete')}
                    disabled={isGeneratingPDF}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Preview Completo</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleGenerateReport(generateNonConformitiesPDF, 'ncs')}
                    disabled={isGeneratingPDF}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    <span>Preview de NCs</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Histórico de Versões */}
          {pullHistory.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <History className="h-4 w-4" />
                  Histórico de Versões
                </div>
                {isRestoring && (
                  <div className="flex items-center gap-2 text-xs text-blue-600">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Criando nova versão...
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {pullHistory.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/30 rounded border">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={entry.version === currentVersion?.version ? "default" : "outline"} size="sm">
                          v{entry.version}
                        </Badge>
                        {entry.action === 'restore' && (
                          <Badge variant="secondary" size="sm" className="text-xs">
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Restauração
                          </Badge>
                        )}
                        {entry.version === currentVersion?.version && (
                          <Badge variant="default" size="sm" className="text-xs">
                            Atual
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(entry.pulled_at)}</span>
                        </div>
                        {entry.pull_notes && (
                          <span className="text-xs text-muted-foreground truncate max-w-xs">
                            "{entry.pull_notes}"
                          </span>
                        )}
                        {entry.action === 'restore' && entry.restored_from_version && (
                          <span className="text-xs text-blue-600">
                            Restaurado da v{entry.restored_from_version}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Ações para cada versão */}
                    <div className="flex items-center gap-1">
                      {/* Preview Dropdown for Version */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline" 
                            size="sm"
                            className="h-7 px-2 text-xs"
                            disabled={isGeneratingPDF}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleVersionReport(entry, 'complete')}
                            disabled={isGeneratingPDF}
                          >
                            <FileText className="mr-2 h-3 w-3" />
                            <span>Preview Completo</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleVersionReport(entry, 'ncs')}
                            disabled={isGeneratingPDF}
                          >
                            <AlertTriangle className="mr-2 h-3 w-3" />
                            <span>Preview de NCs</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleRestoreVersion(entry)}
                        disabled={entry.version === currentVersion?.version || isRestoring}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Restaurar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Avisos e Informações Adicionais */}
          {changeInfo?.hasChanges && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">Alterações Detectadas</div>
                <div className="text-sm mt-1">
                  A inspeção original foi modificada após sua última sincronização. 
                  Clique em "Visualizar e Atualizar" para ver as mudanças.
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Modal de Confirmação de Restauração */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Restaurar Versão</DialogTitle>
            <DialogDescription>
              Você está prestes a restaurar a versão {selectedVersionToRestore?.version}. 
              Esta ação criará uma nova versão baseada na versão selecionada.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedVersionToRestore && (
              <div className="p-3 bg-muted/50 rounded border">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">v{selectedVersionToRestore.version}</Badge>
                  {selectedVersionToRestore.action === 'restore' && (
                    <Badge variant="secondary" size="sm" className="text-xs">
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restauração
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Criada em: {formatDate(selectedVersionToRestore.pulled_at)}</p>
                  {selectedVersionToRestore.pull_notes && (
                    <p className="mt-1">Notas: "{selectedVersionToRestore.pull_notes}"</p>
                  )}
                  {selectedVersionToRestore.action === 'restore' && selectedVersionToRestore.restored_from_version && (
                    <p className="mt-1 text-blue-600">
                      Restaurado da v{selectedVersionToRestore.restored_from_version}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            <div>
              <Label htmlFor="restore-notes">Notas da Restauração (opcional)</Label>
              <Input
                id="restore-notes"
                placeholder="Motivo da restauração, alterações esperadas, etc."
                value={restoreNotes}
                onChange={(e) => setRestoreNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={cancelRestore} disabled={isRestoring}>
              Cancelar
            </Button>
            <Button onClick={confirmRestore} disabled={isRestoring}>
              {isRestoring ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Restaurando...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restaurar Versão
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Preview */}
      <InspectionPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        inspectionId={inspectionId}
        onPullConfirmed={handlePullConfirmed}
      />
    </>
  );
}