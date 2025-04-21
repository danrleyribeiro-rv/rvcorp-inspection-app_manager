// app/(dashboard)/clients/page.js
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Trash2, UserPlus, Users } from "lucide-react";
import EditClientDialog from "./components/EditClientDialog";
import DeleteClientDialog from "./components/DeleteClientDialog";
import TransferClientDialog from "./components/TransferClientDialog";
import CreateClientDialog from "./components/CreateClientDialog";
import { useAuth } from "@/context/auth-context";

export default function ClientsPage() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editClient, setEditClient] = useState(null);
    const [deleteClient, setDeleteClient] = useState(null);
    const [transferClient, setTransferClient] = useState(null);
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
        } catch (error) {
            console.error("Error fetching clients:", error);
            toast({
                title: "Error",
                description: "Failed to fetch clients.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Clients</h1>
                <Button onClick={() => setShowCreateDialog(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Client
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    <h2 className="text-xl font-semibold mb-2">Client List</h2>
                    {clients.length === 0 ? (
                        <p className="text-muted-foreground">No clients found.</p>
                    ) : (
                        <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Segment</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {clients.map((client) => (
                                    <TableRow key={client.id}>
                                        <TableCell>{client.name}</TableCell>
                                        <TableCell>{client.email}</TableCell>
                                        <TableCell>{client.phonenumber}</TableCell>
                                        <TableCell>{client.segment}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setEditClient(client)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setTransferClient(client)}
                                            >
                                                <Users className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setDeleteClient(client)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    )}
                </>
            )}
            
            {/* Create Client Dialog */}
            {showCreateDialog && (
                <CreateClientDialog
                    open={showCreateDialog}
                    onClose={() => setShowCreateDialog(false)}
                    onSuccess={fetchClients}
                />
            )}

            {/* Edit Client Dialog */}
            {editClient && (
                <EditClientDialog
                    client={editClient}
                    open={!!editClient}
                    onClose={() => setEditClient(null)}
                    onUpdate={fetchClients}
                />
            )}

            {/* Delete Client Dialog */}
            {deleteClient && (
                <DeleteClientDialog
                    client={deleteClient}
                    open={!!deleteClient}
                    onClose={() => setDeleteClient(null)}
                    onDelete={fetchClients}
                />
            )}

            {/* Transfer Client Dialog */}
            {transferClient && (
                <TransferClientDialog
                    client={transferClient}
                    open={!!transferClient}
                    onClose={() => setTransferClient(null)}
                    onTransfer={fetchClients}
                />
            )}
        </div>
    );
}