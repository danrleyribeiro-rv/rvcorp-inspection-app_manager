// src/app/(dashboard)/projects/create/page.js
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const statusOptions = ["Aguardando", "Em Andamento", "Em Revisão", "Concluído"];

const projectTypeOptions = [
  "Inspeção de Redes",
  "Inspeção de Obras", 
  "Levantamento Arquitetônico",
  "Implantação",
  "Outro"
];

export default function CreateProjectPage() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "",
    project_price: "",
    client_id: "",
    status: "Aguardando",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [confirmExitDialog, setConfirmExitDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    const hasChanges = formData.title || formData.description || formData.type || 
                      formData.project_price || formData.client_id || formData.status !== "Aguardando";
    setHasUnsavedChanges(hasChanges);
  }, [formData]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const fetchClients = async () => {
    try {
      const clientsQuery = query(
        collection(db, 'clients'),
        where('deleted_at', '==', null)
      );
      
      const clientsSnapshot = await getDocs(clientsQuery);
      
      const clientsList = clientsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => a.name.localeCompare(b.name));
      
      setClients(clientsList);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Erro ao buscar clientes",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      setConfirmExitDialog(true);
    } else {
      router.back();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const projectPrice = parseFloat(formData.project_price) || 0;

      const projectData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        project_price: projectPrice,
        manager_id: user.uid,
        client_id: formData.client_id,
        status: formData.status,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        deleted_at: null
      };
      
      await addDoc(collection(db, 'projects'), projectData);
      
      toast({
        title: "Projeto criado com sucesso"
      });

      setHasUnsavedChanges(false);
      router.push('/projects');
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Erro ao criar projeto",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const ConfirmExitDialog = () => (
    <Dialog open={confirmExitDialog} onOpenChange={setConfirmExitDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterações não salvas</DialogTitle>
          <DialogDescription>
            Você tem alterações não salvas. Deseja sair sem salvar?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setConfirmExitDialog(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={() => router.back()}>
            Sair sem salvar
          </Button>
          <Button onClick={async () => {
            await handleSubmit(new Event('submit'));
            router.back();
          }}>
            Salvar e sair
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b shadow-sm">
        <div className="container mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-xl font-bold">Novo Projeto</h1>
              <p className="text-xs text-muted-foreground">
                Criar um novo projeto
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-sm text-amber-500 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Alterações não salvas
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Informações do Projeto</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="title">Título <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  placeholder="Título"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="project_price">Valor do Projeto <span className="text-red-500">*</span></Label>
                <Input
                  id="project_price"
                  type="number"
                  step="1.00"
                  placeholder="Valor do Projeto"
                  value={formData.project_price}
                  onChange={(e) => updateField('project_price', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <Label htmlFor="description">Descrição <span className="text-red-500">*</span></Label>
              <Textarea
                id="description"
                placeholder="Descrição"
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="type">Tipo de Projeto <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => updateField('type', value)}
                  required
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Selecione um Tipo de Projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectTypeOptions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="client">Cliente <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => updateField('client_id', value)}
                  required
                >
                  <SelectTrigger id="client">
                    <SelectValue placeholder="Selecione um Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => updateField('status', value)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selecione um Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={handleBack}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isLoading ? "Criando..." : "Criar Projeto"}
            </Button>
          </div>
        </form>
      </div>
      
      <ConfirmExitDialog />
    </div>
  );
}