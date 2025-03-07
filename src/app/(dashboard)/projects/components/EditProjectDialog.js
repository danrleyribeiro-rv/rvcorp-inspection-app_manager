// components/projects/components/EditProjectDialog.js
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
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
// Remove: import { Calendar } from "@/components/ui/calendar"
// Remove: import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
// Remove: import { format, parseISO } from "date-fns"
// Remove: import { ptBR } from "date-fns/locale"
// Remove: import { CalendarIcon } from "lucide-react"

const statusOptions = ["Aguardando", "Em Andamento", "Em Revisão", "Concluído"]

// Add project type options
const projectTypeOptions = [
  "Inspeção de Redes",
  "Inspeção de Obras",
  "Levantamento Arquitetônico",
  "Implantação",
  "Outro"
];

export default function EditProjectDialog({ project, open, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: project.title,
    description: project.description || "",
    type: project.type || "", // Use existing type
    project_price: project.project_price?.toString() || "0",
    client_id: project.client_id || "",
    status: project.status || "Aguardando",
    // Remove inspection_date
  });
  const [isLoading, setIsLoading] = useState(false)
  const [clients, setClients] = useState([])
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
        }
    }, [project]);

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Erro ao buscar clientes",
        description: error.message,
        variant: "destructive"
      });
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Convert project price to number
      const projectPrice = parseFloat(formData.project_price) || 0;

      const { error } = await supabase
        .from('projects')
        .update({
          title: formData.title,
          description: formData.description,
          type: formData.type,  // Update the type
          project_price: projectPrice,
          client_id: formData.client_id,
          status: formData.status,
          // Remove inspection_date
          updated_at: new Date()
        })
        .eq('id', project.id);

      if (error) throw error;

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
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
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

          <Input
            type="number"
            step="0.01"
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