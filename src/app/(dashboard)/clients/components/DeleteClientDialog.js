// components/clients/components/DeleteClientDialog.js
"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2 } from "lucide-react";

export default function DeleteClientDialog({ client, open, onClose, onDelete }) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleDelete = async () => {
        setLoading(true);
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
            onDelete(); // Refresh client list
            onClose();
        } catch (error) {
            console.error("Error deleting client:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to delete client.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

     if(!client) return null; //If no client is selected.

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex gap-x-2 items-center">
                        <AlertTriangle className="text-destructive h-6 w-6"/>
                        Are you absolutely sure?
                    </DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. This will permanently delete the client.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {loading ? "Deleting..." : "Delete Client"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}