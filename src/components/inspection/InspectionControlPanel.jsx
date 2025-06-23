// src/components/inspection/InspectionControlPanel.jsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInspectionReleases } from "@/hooks/use-inspection-releases";
import { formatDateSafe } from "@/utils/dateFormater";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  Lock,
  Unlock,
  Package,
  Edit3,
  GitCommit,
  User,
  AlertTriangle,
  Undo,
  Send,
  Loader2
} from "lucide-react";

export default function InspectionControlPanel({ inspection, onUpdate }) {
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [releaseNotes, setReleaseNotes] = useState("");
  const [selectedReleaseForDelivery, setSelectedReleaseForDelivery] = useState("");
  
  const { 
    createRelease, 
    deliverRelease, 
    revertDelivery, 
    toggleEditBlock, 
    fetchReleases, 
    releases, 
    loading 
  } = useInspectionReleases();

  useEffect(() => {
    if (inspection?.id) {
      fetchReleases(inspection.id);
    }
  }, [inspection?.id]);

  const handleCreateRelease = async () => {
    if (!releaseNotes.trim()) return;

    const result = await createRelease(inspection.id, inspection, releaseNotes);
    if (result.success) {
      setReleaseDialogOpen(false);
      setReleaseNotes("");
      onUpdate();
    }
  };

  const handleDeliverRelease = async () => {
    if (!selectedReleaseForDelivery) return;

    const result = await deliverRelease(selectedReleaseForDelivery, inspection.id);
    if (result.success) {
      setDeliveryDialogOpen(false);
      setSelectedReleaseForDelivery("");
      onUpdate();
    }
  };

    const handleRevertDelivery = async () => {
    if (!inspection.delivered_release_id) return;

    const result = await revertDelivery(inspection.delivered_release_id, inspection.id);
    if (result.success) {
        onUpdate();
    }
    };

  const handleToggleEditBlock = async () => {
    const result = await toggleEditBlock(inspection.id, !inspection.inspection_edit_blocked);
    if (result.success) {
      onUpdate();
    }
  };

  const isCompleted = inspection.status === 'completed';
  const isDelivered = inspection.delivered;
  const isEditBlocked = inspection.inspection_edit_blocked;
  const availableReleases = releases.filter(r => !r.is_delivered);
  const deliveredRelease = releases.find(r => r.id === inspection.delivered_release_id);

  const handleToggleCompletion = async () => {
    const newStatus = isCompleted ? 'in_progress' : 'completed';
    
    try {
      const inspectionRef = doc(db, 'inspections', inspection.id);
      await updateDoc(inspectionRef, {
        status: newStatus,
        updated_at: serverTimestamp(),
        ...(newStatus === 'completed' && { completed_at: serverTimestamp() }),
        ...(newStatus === 'in_progress' && { completed_at: null })
      });
      
      onUpdate();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit3 className="h-5 w-5" />
          Controle da Inspeção
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Atual */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Status da Inspeção</Label>
            <Badge variant={isCompleted ? "default" : "secondary"}>
              {isCompleted ? "Concluída" : "Em Andamento"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Entregue ao Cliente</Label>
            <Badge variant={isDelivered ? "default" : "outline"}>
              {isDelivered ? "Entregue" : "Não Entregue"}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Edição Bloqueada</Label>
            <Badge variant={isEditBlocked ? "destructive" : "outline"}>
              {isEditBlocked ? "Bloqueada" : "Liberada"}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Total de Releases</Label>
            <Badge variant="outline">{releases.length}</Badge>
          </div>
        </div>

        <Separator />

        {/* Release Entregue */}
        {isDelivered && deliveredRelease && (
          <div className="space-y-2 p-3 bg-green-50 rounded-md border border-green-200">
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-green-600" />
              <span className="font-medium">Release Entregue:</span>
            </div>
            <div className="text-sm text-green-700">
              <p className="font-medium">Versão: {deliveredRelease.version}</p>
              <p>Entregue em: {formatDateSafe(deliveredRelease.delivered_at)}</p>
              <p>Observações: {deliveredRelease.release_notes}</p>
            </div>
          </div>
        )}

        {/* Último Editor */}
        {inspection.last_editor && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Último editor:</span>
              <span>{inspection.last_editor}</span>
            </div>
          </div>
        )}

        <Separator />

        {/* Controles */}
        <div className="space-y-4">
          {/* Controle de Bloqueio de Edição */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium flex items-center gap-2">
                {isEditBlocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                Bloqueio de Edição
              </Label>
              <p className="text-xs text-muted-foreground">
                {isEditBlocked 
                  ? "Lincer não pode editar" 
                  : "Lincer pode editar"
                }
              </p>
            </div>
            <Switch
              checked={isEditBlocked}
              onCheckedChange={handleToggleEditBlock}
              disabled={loading}
            />
          </div>

          {/* Controle de Finalização da Inspeção */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium flex items-center gap-2">
                {isCompleted ? <Package className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                Finalizar Inspeção
              </Label>
              <p className="text-xs text-muted-foreground">
                {isCompleted 
                  ? "Inspeção concluída - pode reativar para edição" 
                  : "Finalizar e marcar como concluída"
                }
              </p>
            </div>
            <Switch
              checked={isCompleted}
              onCheckedChange={handleToggleCompletion}
              disabled={loading}
            />
          </div>

          {/* Criar Release */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium flex items-center gap-2">
                <GitCommit className="h-4 w-4" />
                Criar Release
              </Label>
              <p className="text-xs text-muted-foreground">
                Salvar estado atual da inspeção
              </p>
            </div>
            <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <GitCommit className="h-4 w-4 mr-2" />
                  Criar Release
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Release da Inspeção</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="release-notes">Observações do Release</Label>
                    <Textarea
                      id="release-notes"
                      placeholder="Descreva as alterações feitas neste release..."
                      value={releaseNotes}
                      onChange={(e) => setReleaseNotes(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div className="bg-muted p-3 rounded-md">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="h-4 w-4" />
                      <span>
                        O estado atual da inspeção será salvo e o bloqueio de edição será removido.
                      </span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setReleaseDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreateRelease} 
                    disabled={!releaseNotes.trim() || loading}
                  >
                    Criar Release
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Entrega ao Cliente */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Send className="h-4 w-4" />
                Entrega ao Cliente
              </Label>
              <p className="text-xs text-muted-foreground">
                Escolher release para entrega
              </p>
            </div>
            <div className="flex gap-2">
              {isDelivered ? (
                <Button
                variant="outline"
                size="sm"
                onClick={handleRevertDelivery}
                disabled={loading}
                >
                {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                    <Undo className="h-4 w-4 mr-2" />
                )}
                {loading ? "Revertendo..." : "Reverter Entrega"}
                </Button>
              ) : (
                <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="default" 
                      size="sm"
                      disabled={availableReleases.length === 0}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Entregar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Entregar Release ao Cliente</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Selecionar Release para Entrega</Label>
                        <Select value={selectedReleaseForDelivery} onValueChange={setSelectedReleaseForDelivery}>
                          <SelectTrigger>
                            <SelectValue placeholder="Escolha um release" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableReleases.map((release) => (
                              <SelectItem key={release.id} value={release.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">Versão {release.version}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDateSafe(release.created_at)} - {release.release_notes}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {availableReleases.length === 0 && (
                        <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                          <div className="flex items-center gap-2 text-sm text-yellow-700">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Nenhum release disponível para entrega. Crie um release primeiro.</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDeliveryDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleDeliverRelease} 
                        disabled={!selectedReleaseForDelivery || loading}
                      >
                        Entregar Release
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>

        {/* Lista de Releases */}
        {releases.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm font-medium">Histórico de Releases</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {releases.map((release) => (
                  <div key={release.id} className="flex items-center justify-between p-2 border rounded-md text-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">v{release.version}</span>
                        {release.is_delivered && (
                          <Badge variant="default" className="text-xs">
                            Entregue
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {release.release_notes}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateSafe(release.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}