// components/projects/components/CreateProjectDialog.js
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
// No need for Calendar, Popover, format, ptBR, or CalendarIcon

const statusOptions = ["Aguardando", "Em Andamento", "Em Revisão", "Concluído"]

// Add project type options
const projectTypeOptions = [
    "Inspeção de Redes",
    "Inspeção de Obras",
    "Levantamento Arquitetônico",
    "Implantação",
    "Outro" // Add "Other" option
];

export function CreateProjectDialog({ open, onClose, onSuccess, managerId }) {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        type: "",  // Will hold the selected project type
        project_price: "",
        client_id: "",
        status: "Aguardando",
        // Remove inspection_date
    });
    const [isLoading, setIsLoading] = useState(false);
    const [clients, setClients] = useState([]);
    const { toast } = useToast()

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

            const { data, error } = await supabase
                .from('projects')
                .insert({
                    title: formData.title,
                    description: formData.description,
                    type: formData.type,
                    project_price: projectPrice,
                    manager_id: managerId,
                    client_id: formData.client_id,
                    status: formData.status,
                    // Remove inspection_date
                })
                .select();

            if (error) throw error;

            toast({
                title: "Projeto criado com sucesso"
            });

            onSuccess();
            onClose(false);
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
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Novo Projeto</DialogTitle>
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
                    {/* Remove Date Picker */}
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onClose(false)}
                            disabled={isLoading}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Criando..." : "Criar"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}