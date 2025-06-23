// components/clients/components/EditClientDialog.js
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";


export default function EditClientDialog({ client, open, onClose, onUpdate }) {

    const [formData, setFormData] = useState({
        name: client?.name || "",
        document: client?.document || "",
        responsible_name: client?.responsible_name || "",
        responsible_surname: client?.responsible_surname || "",
        address: client?.address || "",
        email: client?.email || "",
        phonenumber: client?.phonenumber || "",
        segment: client?.segment || "",
    });
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

     useEffect(() => {
        // Update local state when the client prop changes
        if (client) {
            setFormData({
                name: client.name || "",
                document: client.document || "",
                responsible_name: client.responsible_name || "",
                responsible_surname: client.responsible_surname || "",
                address: client.address || "",
                email: client.email || "",
                phonenumber: client.phonenumber || "",
                segment: client.segment || "",
            });
        }
    }, [client]);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
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
          onUpdate(); // Refresh the client list
          onClose();

        } catch (error) {
            toast({
                title: "Erro ao atualizar cliente",
                description: error.message || "Erro ao atualizar cliente.",
                variant: "destructive",
            });
        } finally {
          setLoading(false)
        }
    };

    if(!client) return null; //If no client is selected.

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Editar Cliente</DialogTitle>
                    <DialogDescription>
                        Modifique as informações do cliente.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpdateClient}  className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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
                            <Label htmlFor="responsible_surname">Sobrenome do Responsável</Label>
                            <Input
                                id="responsible_surname"
                                name="responsible_surname"
                                value={formData.responsible_surname}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                        />
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
                            <Input
                                id="segment"
                                name="segment"
                                value={formData.segment}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {loading ? "Updating..." : "Atualizar Cliente"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}