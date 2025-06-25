// app/(dashboard)/projects/components/GrantAccessDialog.js
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Shield, Check, X } from "lucide-react";

export default function GrantAccessDialog({ open, onClose, project, onAccessGranted }) {
  const [subManagers, setSubManagers] = useState([]);
  const [selectedSubManagers, setSelectedSubManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSubManagers, setLoadingSubManagers] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchSubManagers();
      // Inicializar com subgerentes que já têm acesso
      setSelectedSubManagers(project?.shared_with || []);
    }
  }, [open, project]);

  const fetchSubManagers = async () => {
    setLoadingSubManagers(true);
    try {
      // Primeiro, buscar usuários com role "sub_manager"
      const usersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'sub_manager')
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      const subManagersList = [];
      
      // Para cada usuário sub_manager, buscar seus dados na coleção managers
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        
        try {
          // Buscar dados detalhados na coleção managers
          const managersQuery = query(
            collection(db, 'managers'),
            where('user_id', '==', userDoc.id)
          );
          const managersSnapshot = await getDocs(managersQuery);
          
          if (!managersSnapshot.empty) {
            const managerData = managersSnapshot.docs[0].data();
            
            // Verificar se tem permissão para visualizar projetos
            if (managerData.permissions?.includes('view_projects')) {
              subManagersList.push({
                id: userDoc.id,
                email: userData.email,
                ...managerData,
                managerId: managersSnapshot.docs[0].id
              });
            }
          }
        } catch (err) {
          console.error(`Error fetching manager data for user ${userDoc.id}:`, err);
        }
      }
      
      setSubManagers(subManagersList);
    } catch (error) {
      console.error("Error fetching sub-managers:", error);
      toast({
        title: "Erro ao carregar subgerentes",
        description: "Não foi possível carregar a lista de subgerentes disponíveis.",
        variant: "destructive"
      });
    } finally {
      setLoadingSubManagers(false);
    }
  };

  const handleSubManagerToggle = (subManagerId) => {
    setSelectedSubManagers(prev => {
      if (prev.includes(subManagerId)) {
        return prev.filter(id => id !== subManagerId);
      } else {
        return [...prev, subManagerId];
      }
    });
  };

  const handleGrantAccess = async () => {
    setLoading(true);
    try {
      const projectRef = doc(db, 'projects', project.id);
      
      await updateDoc(projectRef, {
        shared_with: selectedSubManagers,
        access_updated_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      const selectedSubManagersData = subManagers.filter(sm => selectedSubManagers.includes(sm.id));
      
      toast({
        title: "Acesso atualizado com sucesso",
        description: selectedSubManagers.length > 0 
          ? `Acesso concedido a ${selectedSubManagers.length} subgerente(s)`
          : "Todos os acessos foram removidos"
      });

      onAccessGranted?.();
      onClose();
    } catch (error) {
      console.error("Error updating project access:", error);
      toast({
        title: "Erro ao atualizar acesso",
        description: "Não foi possível atualizar as permissões do projeto.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getAccessChanges = () => {
    const currentAccess = project?.shared_with || [];
    const added = selectedSubManagers.filter(id => !currentAccess.includes(id));
    const removed = currentAccess.filter(id => !selectedSubManagers.includes(id));
    return { added, removed };
  };

  const { added, removed } = getAccessChanges();
  const hasChanges = added.length > 0 || removed.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Gerenciar Acesso do Projeto
          </DialogTitle>
          <DialogDescription>
            Conceda ou remova acesso ao projeto "{project?.title}" para subgerentes autorizados.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Informações do Projeto */}
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2">Projeto:</h4>
            <p className="text-sm font-medium">{project?.title}</p>
            <p className="text-xs text-muted-foreground">
              Cliente: {project?.clients?.name || "Não informado"}
            </p>
          </div>

          {/* Lista de Subgerentes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Subgerentes Disponíveis</Label>
              {loadingSubManagers && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {loadingSubManagers ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">Carregando subgerentes...</span>
              </div>
            ) : subManagers.length === 0 ? (
              <div className="text-center p-6 text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum subgerente com permissão de visualizar projetos encontrado</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                {subManagers.map((subManager) => {
                  const isSelected = selectedSubManagers.includes(subManager.id);
                  const wasSelected = project?.shared_with?.includes(subManager.id);
                  const isAdded = added.includes(subManager.id);
                  const isRemoved = removed.includes(subManager.id);
                  
                  return (
                    <div
                      key={subManager.id}
                      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                        isSelected ? 'bg-green-50 border-green-200' : 'hover:bg-accent'
                      }`}
                      onClick={() => handleSubManagerToggle(subManager.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          disabled={true}
                        />
                        
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={subManager.profileImageUrl} />
                          <AvatarFallback className="text-xs">
                            {subManager.name?.charAt(0)?.toUpperCase()}{subManager.last_name?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">
                              {subManager.name} {subManager.last_name}
                            </p>
                            {isAdded && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                <Check className="h-3 w-3 inline mr-1" />
                                Adicionado
                              </span>
                            )}
                            {isRemoved && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                <X className="h-3 w-3 inline mr-1" />
                                Removido
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{subManager.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {subManager.profession || "Subgerente"}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {subManager.permissions?.length || 0} permissões
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resumo das Mudanças */}
          {hasChanges && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-sm mb-2 text-blue-800">Resumo das Alterações:</h4>
              {added.length > 0 && (
                <p className="text-xs text-blue-700 mb-1">
                  <Check className="h-3 w-3 inline mr-1" />
                  {added.length} subgerente(s) terão acesso concedido
                </p>
              )}
              {removed.length > 0 && (
                <p className="text-xs text-blue-700">
                  <X className="h-3 w-3 inline mr-1" />
                  {removed.length} subgerente(s) terão acesso removido
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleGrantAccess}
            disabled={loading || loadingSubManagers || !hasChanges}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Atualizar Acesso
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}