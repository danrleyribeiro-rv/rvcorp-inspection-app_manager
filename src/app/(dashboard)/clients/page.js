// app/(dashboard)/clients/page.js
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Trash2, UserPlus, Users } from "lucide-react";
import EditClientDialog from "./components/EditClientDialog";
import DeleteClientDialog from "./components/DeleteClientDialog";
import TransferClientDialog from "./components/TransferClientDialog";


export default function ClientsPage() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editClient, setEditClient] = useState(null); // State for editing
    const [deleteClient, setDeleteClient] = useState(null); // State for deleting
    const [transferClient, setTransferClient] = useState(null); // State for transfer
    const { toast } = useToast();

    // Form state
    const [newClient, setNewClient] = useState({
        name: "",
        email: "",
        password: "",
        document: "",
        responsible_name: "",
        responsible_surname: "",
        address: "",
        phonenumber: "",
        segment: "",
    });


    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("clients")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setClients(data || []);
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

    const handleInputChange = (e) => {
        setNewClient({ ...newClient, [e.target.name]: e.target.value });
    };

    const handleCreateClient = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase.rpc('create_client', {
                email: newClient.email,       // Correct order and names
                password: newClient.password,
                name: newClient.name,
                document: newClient.document,
                responsible_name: newClient.responsible_name,
                responsible_surname: newClient.responsible_surname,
                address: newClient.address,
                phonenumber: newClient.phonenumber,
                segment: newClient.segment
            });


            if (error) {
                throw error;
            }

            toast({
                title: "Success",
                description: "Client created successfully!",
            });
            //Refetch
            fetchClients();
            setShowCreateForm(false)
            setNewClient({ //Clear form
                name: "",
                email: "",
                password: "",
                document: "",
                responsible_name: "",
                responsible_surname: "",
                address: "",
                phonenumber: "",
                segment: "",
            });
        } catch (error) {
            console.error("Error creating client:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to create client.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container p-6">
            <h1 className="text-3xl font-bold mb-4">Clients</h1>

            <Button onClick={() => setShowCreateForm(!showCreateForm)} className="mb-4">
                <UserPlus className="mr-2" />
                {showCreateForm ? "Hide Form" : "Create Client"}
            </Button>

            {showCreateForm && (
                <form onSubmit={handleCreateClient} className="space-y-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                name="name"
                                value={newClient.name}
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
                                value={newClient.email}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="password">Password</Label>
                            <Input
                                type="password"
                                id="password"
                                name="password"
                                value={newClient.password}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="document">Document</Label>
                            <Input
                                id="document"
                                name="document"
                                value={newClient.document}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <Label htmlFor="responsible_name">Responsible Name</Label>
                            <Input
                                id="responsible_name"
                                name="responsible_name"
                                value={newClient.responsible_name}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <Label htmlFor="responsible_surname">Responsible Surname</Label>
                            <Input
                                id="responsible_surname"
                                name="responsible_surname"
                                value={newClient.responsible_surname}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                name="address"
                                value={newClient.address}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <Label htmlFor="phonenumber">Phone Number</Label>
                            <Input
                                id="phonenumber"
                                name="phonenumber"
                                value={newClient.phonenumber}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <Label htmlFor="segment">Segment</Label>
                            <Input
                                id="segment"
                                name="segment"
                                value={newClient.segment}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>
                    <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {loading ? "Creating..." : "Create Client"}
                    </Button>
                </form>
            )}

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