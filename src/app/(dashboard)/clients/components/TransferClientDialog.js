// components/clients/components/TransferClientDialog.js
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function TransferClientDialog({ client, open, onClose, onTransfer }) {
    const [managers, setManagers] = useState([]);
    const [selectedManager, setSelectedManager] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchManagers();
    }, []);

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

    const handleTransfer = async () => {
      setLoading(true);
      try{
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

        onTransfer(); // Refresh the client list
        onClose();

      } catch (error) {
          console.error("Error transfering client:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to transfer client.",
            variant: "destructive"
          });
      } finally {
        setLoading(false);
      }
    };

    if(!client) return null;
    
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Transfer Client</DialogTitle>
                    <DialogDescription>
                        Select a manager to transfer this client to.
                    </DialogDescription>
                </DialogHeader>
                <Select onValueChange={setSelectedManager} value={selectedManager}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a manager" />
                    </SelectTrigger>
                    <SelectContent>
                        {managers.map((manager) => (
                            <SelectItem key={manager.id} value={manager.id}>
                                {manager.name} {manager.surname}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="pt-4 flex justify-end gap-x-2">
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button onClick={handleTransfer} disabled={loading}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {loading ? "Transferring..." : "Transfer Client"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}