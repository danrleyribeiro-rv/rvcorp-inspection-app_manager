// app/(dashboard)/clients/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Search } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import ClientCard from "./components/ClientCard";

export default function ClientsPage() {
    const router = useRouter();
    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            fetchClients();
        }
    }, [user]);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const clientsQuery = query(
                collection(db, 'clients'),
                where('deleted_at', '==', null)
            );
            
            const clientsSnapshot = await getDocs(clientsQuery);
            
            const clientsList = clientsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                created_at: doc.data().created_at?.toDate().toISOString()
            })).sort((a, b) => {
                if (!a.created_at || !b.created_at) return 0;
                return new Date(b.created_at) - new Date(a.created_at);
            });
            
            setClients(clientsList);
            setFilteredClients(clientsList);
        } catch (error) {
            toast({
                title: "Erro ao Carregar Clientes",
                description: "Não foi possível carregar a lista de clientes.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (searchTerm.trim() === "") {
            setFilteredClients(clients);
        } else {
            const filtered = clients.filter(client =>
                client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.segment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.document?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredClients(filtered);
        }
    }, [searchTerm, clients]);

    return (
        <div className="container p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Clientes</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie seus clientes ({filteredClients.length} {filteredClients.length === 1 ? 'cliente' : 'clientes'})
                    </p>
                </div>
                <Button onClick={() => router.push('/clients/create')}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Novo Cliente
                </Button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                    placeholder="Buscar clientes por nome, email, segmento ou documento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {filteredClients.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">
                                {searchTerm.trim() ? 
                                    "Nenhum cliente encontrado com os critérios de busca." : 
                                    "Não foram encontrados clientes."
                                }
                            </p>
                            {!searchTerm.trim() && (
                                <Button 
                                    onClick={() => router.push('/clients/create')} 
                                    className="mt-4"
                                    variant="outline"
                                >
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Criar Primeiro Cliente
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredClients.map((client) => (
                                <ClientCard key={client.id} client={client} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}