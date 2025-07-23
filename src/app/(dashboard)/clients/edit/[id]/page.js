"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Trash2, UserCheck, AlertTriangle, Save } from "lucide-react";

export default function EditClientPage({ params }) {
    const router = useRouter();
    const { id } = use(params);
    const [client, setClient] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        document: "",
        responsible_name: "",
        responsible_surname: "",
        address: "",
        street: "",
        neighborhood: "",
        city: "",
        state: "",
        cep: "",
        email: "",
        phonenumber: "",
        segment: "",
    });
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [cepLoading, setCepLoading] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [confirmExitDialog, setConfirmExitDialog] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [transferDialogOpen, setTransferDialogOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [transferLoading, setTransferLoading] = useState(false);
    const [managers, setManagers] = useState([]);
    const [selectedManager, setSelectedManager] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        if (client) {
            const currentData = JSON.stringify(formData);
            const originalData = JSON.stringify({
                name: client.name || "",
                document: client.document || "",
                responsible_name: client.responsible_name || "",
                responsible_surname: client.responsible_surname || "",
                address: client.address || "",
                street: client.street || "",
                neighborhood: client.neighborhood || "",
                city: client.city || "",
                state: client.state || "",
                cep: client.cep || "",
                email: client.email || "",
                phonenumber: client.phonenumber || "",
                segment: client.segment || "",
            });
            setHasUnsavedChanges(currentData !== originalData);
        }
    }, [formData, client]);

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

    useEffect(() => {
        if (id) {
            fetchClient();
            fetchManagers();
        }
    }, [id]);

    const fetchClient = async () => {
        try {
            const clientRef = doc(db, 'clients', id);
            const clientSnap = await getDoc(clientRef);
            
            if (clientSnap.exists()) {
                const clientData = { id: clientSnap.id, ...clientSnap.data() };
                setClient(clientData);
                setFormData({
                    name: clientData.name || "",
                    document: clientData.document || "",
                    responsible_name: clientData.responsible_name || "",
                    responsible_surname: clientData.responsible_surname || "",
                    address: clientData.address || "",
                    street: clientData.street || "",
                    neighborhood: clientData.neighborhood || "",
                    city: clientData.city || "",
                    state: clientData.state || "",
                    cep: clientData.cep || "",
                    email: clientData.email || "",
                    phonenumber: clientData.phonenumber || "",
                    segment: clientData.segment || "",
                });
            } else {
                toast({
                    title: "Cliente não encontrado",
                    description: "O cliente solicitado não existe.",
                    variant: "destructive",
                });
                router.push('/clients');
            }
        } catch (error) {
            console.error("Error fetching client:", error);
            toast({
                title: "Erro",
                description: "Falha ao carregar cliente.",
                variant: "destructive",
            });
        } finally {
            setPageLoading(false);
        }
    };

    const fetchManagers = async () => {
        try {
            // Query active managers from Firestore
            const managersQuery = query(
                collection(db, 'managers'),
                where('deleted_at', '==', null)
            );
            
            const managersSnapshot = await getDocs(managersQuery);
            
            const managersList = managersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            setManagers(managersList);
        } catch (error) {
            console.error("Error fetching managers:", error);
            toast({
                title: "Error",
                description: "Failed to fetch managers.",
                variant: "destructive",
            });
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCepBlur = async () => {
        const cep = formData.cep.replace(/\D/g, '');
        if (cep.length !== 8) return;
        
        setCepLoading(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            if (!response.ok) {
                throw new Error('Erro ao consultar CEP');
            }
            
            const data = await response.json();
            
            if (!data.erro) {
                setFormData(prev => ({
                    ...prev,
                    street: data.logradouro || prev.street,
                    neighborhood: data.bairro || prev.neighborhood,
                    city: data.localidade || prev.city,
                    state: data.uf || prev.state
                }));
            } else {
                toast({
                    title: "CEP não encontrado",
                    description: "O CEP informado não foi encontrado",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
            toast({
                title: "Erro",
                description: "Não foi possível consultar o CEP",
                variant: "destructive",
            });
        } finally {
            setCepLoading(false);
        }
    };
    
    const handleUpdateClient = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Update client document in Firestore
            const clientRef = doc(db, 'clients', client.id);
            
            await updateDoc(clientRef, {
                ...formData,
                updated_at: serverTimestamp()
            });

            toast({
                title: "Cliente atualizado",
                description: "Cliente atualizado com sucesso",
            });

            setHasUnsavedChanges(false);
            router.push('/clients');
        } catch (error) {
            toast({
                title: "Erro ao atualizar cliente",
                description: error.message || "Erro ao atualizar cliente.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setDeleteLoading(true);
        try {
            // Soft delete by setting deleted_at
            const clientRef = doc(db, 'clients', client.id);
            
            await updateDoc(clientRef, {
                deleted_at: serverTimestamp(),
                updated_at: serverTimestamp()
            });

            toast({
                title: "Success",
                description: "Client deleted successfully",
            });
            
            router.push('/clients');
        } catch (error) {
            console.error("Error deleting client:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to delete client.",
                variant: "destructive",
            });
        } finally {
            setDeleteLoading(false);
            setDeleteDialogOpen(false);
        }
    };

    const handleTransfer = async () => {
        setTransferLoading(true);
        try {
            if (!selectedManager) {
                toast({
                    title: "Error",
                    description: "Please select a manager to transfer the client to.",
                    variant: "destructive",
                });
                return;
            }

            // Update client with new manager_id
            const clientRef = doc(db, 'clients', client.id);
            
            await updateDoc(clientRef, {
                manager_id: selectedManager,
                updated_at: serverTimestamp()
            });

            toast({
                title: "Success",
                description: "Client transferred successfully!",
            });

            router.push('/clients');
        } catch (error) {
            console.error("Error transfering client:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to transfer client.",
                variant: "destructive"
            });
        } finally {
            setTransferLoading(false);
            setTransferDialogOpen(false);
        }
    };

    const handleBack = () => {
        if (hasUnsavedChanges) {
            setConfirmExitDialog(true);
        } else {
            router.back();
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
                        await handleUpdateClient(new Event('submit'));
                        if (!loading) {
                            router.back();
                        }
                    }} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Salvar e sair
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    if (pageLoading) {
        return (
            <div className="container mx-auto py-8 px-4 max-w-2xl">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="container mx-auto py-8 px-4 max-w-2xl">
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Cliente não encontrado.</p>
                </div>
            </div>
        );
    }

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
                            <h1 className="text-xl font-bold">Editar Cliente</h1>
                            <p className="text-xs text-muted-foreground">
                                Modifique as informações do cliente
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
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTransferDialogOpen(true)}
                            disabled={loading}
                        >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Transferir
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteDialogOpen(true)}
                            disabled={loading}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                        </Button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto p-6">
                <form onSubmit={handleUpdateClient} className="space-y-6">
                    <div className="bg-card border rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-4">Informações do Cliente</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="name">Nome</Label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                disabled // Email can't be changed as it's tied to authentication
                            />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="document">Documento</Label>
                        <Input
                            id="document"
                            name="document"
                            value={formData.document}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="responsible_name">Nome do Responsável</Label>
                            <Input
                                id="responsible_name"
                                name="responsible_name"
                                value={formData.responsible_name}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <Label htmlFor="responsible_surname">Sobrenome do Responsável</Label>
                            <Input
                                id="responsible_surname"
                                name="responsible_surname"
                                value={formData.responsible_surname}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    {/* CEP e endereço */}
                    <div className="space-y-2">
                        <Label htmlFor="cep">CEP</Label>
                        <div className="flex gap-2 items-center">
                            <Input
                                id="cep"
                                name="cep"
                                value={formData.cep}
                                onChange={handleInputChange}
                                onBlur={handleCepBlur}
                                placeholder="00000-000"
                                className="flex-1"
                            />
                            {cepLoading && <Loader2 className="animate-spin h-5 w-5" />}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="street">Rua</Label>
                            <Input
                                id="street"
                                name="street"
                                value={formData.street}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <Label htmlFor="neighborhood">Bairro</Label>
                            <Input
                                id="neighborhood"
                                name="neighborhood"
                                value={formData.neighborhood}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="city">Cidade</Label>
                            <Input
                                id="city"
                                name="city"
                                value={formData.city}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <Label htmlFor="state">Estado</Label>
                            <Input
                                id="state"
                                name="state"
                                value={formData.state}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="address">Endereço Adicional</Label>
                        <Input
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder="Complemento, número, referências..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="phonenumber">Telefone</Label>
                            <Input
                                id="phonenumber"
                                name="phonenumber"
                                value={formData.phonenumber}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <Label htmlFor="segment">Segmento</Label>
                            <Input
                                id="segment"
                                name="segment"
                                value={formData.segment}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    </div>

                    <div className="flex justify-end gap-4">
                        <Button type="button" variant="outline" onClick={handleBack} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {loading ? "Atualizando..." : "Atualizar Cliente"}
                        </Button>
                    </div>
                </form>
            </div>

            <ConfirmExitDialog />

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex gap-x-2 items-center">
                            <AlertTriangle className="text-destructive h-6 w-6"/>
                            Tem certeza absoluta?
                        </DialogTitle>
                        <DialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
                            Cancelar
                        </Button>
                        <Button 
                            variant="destructive"
                            onClick={handleDelete} 
                            disabled={deleteLoading}
                        >
                            {deleteLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {deleteLoading ? "Excluindo..." : "Excluir Cliente"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Transfer Dialog */}
            <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Transferir Cliente</DialogTitle>
                        <DialogDescription>
                            Selecione um gerente para transferir este cliente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Select onValueChange={setSelectedManager} value={selectedManager}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione um gerente" />
                            </SelectTrigger>
                            <SelectContent>
                                {managers.map((manager) => (
                                    <SelectItem key={manager.id} value={manager.id}>
                                        {manager.name} {manager.surname}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setTransferDialogOpen(false)} disabled={transferLoading}>
                            Cancelar
                        </Button>
                        <Button onClick={handleTransfer} disabled={transferLoading}>
                            {transferLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {transferLoading ? "Transferindo..." : "Transferir Cliente"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}