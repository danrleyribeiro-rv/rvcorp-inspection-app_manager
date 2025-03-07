// components/clients/components/TransferClientDialog.js

"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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
        const fetchManagers = async () => {
            try {
                const { data, error } = await supabase
                    .from("managers")
                    .select("id, name, surname") // Fetch manager names
                    .is('deleted_at', null);

                if (error) throw error;
                setManagers(data || []);
            } catch (error) {
                console.error("Error fetching managers:", error);
            }
        };

        fetchManagers();
    }, []);

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

        const { error } = await supabase
            .from("clients")
            .update({ manager_id: selectedManager })
            .eq("id", client.id);

        if (error) throw error;

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