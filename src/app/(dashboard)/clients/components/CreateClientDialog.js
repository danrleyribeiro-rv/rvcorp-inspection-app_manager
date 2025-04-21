// components/clients/components/CreateClientDialog.js
"use client";

import { useState } from "react";
import { db, auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";

const SEGMENT_OPTIONS = [
    "Redes de Varejo",
    "Inspeção de Obras",
    "Hotelaria", 
    "Avulso",
    "Outro"
];

export default function CreateClientDialog({ open, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        document: "",
        responsible_name: "",
        responsible_surname: "",
        address: "",
        street: "",
        neighborhood: "",
        city: "",
        state: "",
        cep: "",
        phonenumber: "",
        segment: "",
    });
    const [loading, setLoading] = useState(false);
    const [cepLoading, setCepLoading] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validação básica
            if (!formData.name || !formData.email || !formData.password) {
                throw new Error("Nome, email e senha são campos obrigatórios");
            }

            if (formData.password.length < 6) {
                throw new Error("A senha deve ter pelo menos 6 caracteres");
            }

            // 1. Criar usuário no Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );
            
            // 2. Criar documento do cliente no Firestore
            const clientData = {
                user_id: userCredential.user.uid,
                name: formData.name,
                email: formData.email,
                document: formData.document || null,
                responsible_name: formData.responsible_name || null,
                responsible_surname: formData.responsible_surname || null,
                address: formData.address || null,
                cep: formData.cep || null,
                street: formData.street || null,
                neighborhood: formData.neighborhood || null,
                city: formData.city || null,
                state: formData.state || null,
                phonenumber: formData.phonenumber || null,
                segment: formData.segment || null,
                manager_id: user.uid,
                created_at: serverTimestamp(),
                updated_at: serverTimestamp(),
                deleted_at: null
            };
            
            await addDoc(collection(db, 'clients'), clientData);

            // 3. Criar documento na coleção 'users'
            const userData = {
                email: formData.email,
                role: "client",
                created_at: serverTimestamp(),
                updated_at: serverTimestamp()
            };

            await addDoc(collection(db, 'users'), {
                ...userData,
                user_id: userCredential.user.uid
            });

            toast({
                title: "Sucesso",
                description: "Cliente criado com sucesso!",
            });
            
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Erro ao criar cliente:", error);
            
            // Tratamento de erros específicos do Firebase Auth
            if (error.code === 'auth/email-already-in-use') {
                toast({
                    title: "Erro",
                    description: "Este email já está registrado. Por favor, use um email diferente.",
                    variant: "destructive",
                });
            } else if (error.code === 'auth/invalid-email') {
                toast({
                    title: "Erro",
                    description: "Por favor, forneça um endereço de email válido.",
                    variant: "destructive",
                });
            } else if (error.code === 'auth/weak-password') {
                toast({
                    title: "Erro",
                    description: "Senha muito fraca. Por favor, use uma senha mais forte.",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Erro",
                    description: error.message || "Falha ao criar cliente.",
                    variant: "destructive",
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Novo Cliente</DialogTitle>
                    <DialogDescription>
                        Adicione um novo cliente ao seu painel.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Informações básicas */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="name">Nome*</Label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="email">Email*</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="password">Senha*</Label>
                        <Input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            A senha deve ter pelo menos 6 caracteres.
                        </p>
                    </div>
                    <div>
                        <Label htmlFor="document">Documento (CPF/CNPJ)</Label>
                        <Input
                            id="document"
                            name="document"
                            value={formData.document}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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
                            <Label htmlFor="responsible_surname">Sobrenome</Label>
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
                        <div className="flex gap-2">
                            <Input
                                id="cep"
                                name="cep"
                                value={formData.cep}
                                onChange={handleInputChange}
                                onBlur={handleCepBlur}
                                placeholder="00000-000"
                            />
                            {cepLoading && <Loader2 className="animate-spin h-5 w-5" />}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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

                    <div className="grid grid-cols-2 gap-4">
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

                    <div className="grid grid-cols-2 gap-4">
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
                            <Select
                                value={formData.segment}
                                onValueChange={(value) => setFormData({...formData, segment: value})}
                            >
                                <SelectTrigger id="segment">
                                    <SelectValue placeholder="Segmento" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SEGMENT_OPTIONS.map((segment) => (
                                        <SelectItem key={segment} value={segment}>
                                            {segment}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {loading ? "Criando..." : "Criar Cliente"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}