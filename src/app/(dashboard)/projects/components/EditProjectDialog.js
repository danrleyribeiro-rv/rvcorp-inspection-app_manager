// components/projects/components/EditProjectDialog.js
"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { doc, updateDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

const statusOptions = ["Aguardando", "Em Andamento", "Em Revisão", "Concluído"]

// Project type options
const projectTypeOptions = [
  "Inspeção de Redes",
  "Inspeção de Obras", 
  "Levantamento Arquitetônico",
  "Implantação",
  "Inspeção Predial",
  "Inspeção de Estruturas",
  "Laudo Técnico",
  "Vistoria de Imóveis",
  "Perícia Técnica",
  "Avaliação de Imóveis",
  "Diagnóstico Estrutural",
  "Inspeção de Instalações",
  "Outro"
];

export default function EditProjectDialog({ project, open, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: project.title,
    description: project.description || "",
    type: project.type || "",
    project_price: project.project_price?.toString() || "0",
    client_id: project.client_id || "",
    status: project.status || "Aguardando",
  });
  const [isLoading, setIsLoading] = useState(false)
  const [clients, setClients] = useState([])
  const [showCustomTypeInput, setShowCustomTypeInput] = useState(false)
  const [customType, setCustomType] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    // Update form data when the project prop changes
    if (project) {
      setFormData({
        title: project.title,
        description: project.description || "",
        type: project.type || "",
        project_price: project.project_price?.toString() || "0",
        client_id: project.client_id || "",
        status: project.status || "Aguardando",
      });
      
      // Check if current type is a custom type (not in predefined options)
      const isCustomType = project.type && !projectTypeOptions.includes(project.type);
      if (isCustomType) {
        setShowCustomTypeInput(true);
        setCustomType(project.type);
        setFormData(prev => ({ ...prev, type: "Outro" }));
      } else {
        setShowCustomTypeInput(false);
        setCustomType("");
      }
    }
  }, [project]);

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      // Query clients that aren't deleted
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
  }

  const handleTypeChange = (value) => {
    setFormData(prev => ({ ...prev, type: value }));
    
    // Handle custom type logic
    if (value === 'Outro') {
      setShowCustomTypeInput(true);
    } else {
      setShowCustomTypeInput(false);
      setCustomType("");
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Convert project price to number
      const projectPrice = parseFloat(formData.project_price) || 0;
      
      // Use custom type if "Outro" was selected and custom type is provided
      const finalType = formData.type === 'Outro' && customType.trim() 
        ? customType.trim() 
        : formData.type;

      // Update the project document
      const projectRef = doc(db, 'projects', project.id);
      
      await updateDoc(projectRef, {
        title: formData.title,
        description: formData.description,
        type: finalType,
        project_price: projectPrice,
        client_id: formData.client_id,
        status: formData.status,
        updated_at: serverTimestamp()
      });

      toast({
        title: "Projeto atualizado com sucesso"
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating project:", error);
      toast({
        title: "Erro ao atualizar projeto",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Projeto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Título"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            required
            disabled={isLoading}
          />
          <Textarea
            placeholder="Descrição"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            required
            disabled={isLoading}
          />
          {/* Project Type Select */}
          <div>
            <Select
              value={formData.type}
              onValueChange={handleTypeChange}
              disabled={isLoading}
              required
            >
              <SelectTrigger>
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
            
            {showCustomTypeInput && (
              <Input
                placeholder="Digite o novo tipo de projeto"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                className="mt-2"
                required={formData.type === 'Outro'}
                disabled={isLoading}
              />
            )}
          </div>

          <Input
            type="number"
            min="0"
            step="1.00"
            placeholder="Valor do Projeto"
            value={formData.project_price}
            onChange={(e) =>
              setFormData({ ...formData, project_price: e.target.value })
            }
            required
            disabled={isLoading}
          />
          <Select
            value={formData.client_id}
            onValueChange={(value) =>
              setFormData({ ...formData, client_id: value })
            }
            disabled={isLoading}
            required
          >
            <SelectTrigger>
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
          <Select
            value={formData.status}
            onValueChange={(value) =>
              setFormData({ ...formData, status: value })
            }
            disabled={isLoading}
          >
            <SelectTrigger>
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

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}