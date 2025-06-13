// components/projects/components/CreateProjectDialog.js
"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore"
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
    "Outro"
];

export function CreateProjectDialog({ open, onClose, onSuccess, managerId }) {
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
    const { toast } = useToast()

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

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            // Convert project price to number
            const projectPrice = parseFloat(formData.project_price) || 0;

            // Create project document
            const projectData = {
                title: formData.title,
                description: formData.description,
                type: formData.type,
                project_price: projectPrice,
                manager_id: managerId,
                client_id: formData.client_id,
                status: formData.status,
                created_at: serverTimestamp(),
                updated_at: serverTimestamp(),
                deleted_at: null
            };
            
            const docRef = await addDoc(collection(db, 'projects'), projectData);
            
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