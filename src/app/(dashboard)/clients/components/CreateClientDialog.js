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
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";

export default function CreateClientDialog({ open, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
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
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Basic validation
            if (!formData.name || !formData.email || !formData.password) {
                throw new Error("Name, email and password are required fields");
            }

            if (formData.password.length < 6) {
                throw new Error("Password must be at least 6 characters long");
            }

            // 1. Create user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );
            
            // 2. Create client document in Firestore
            const clientData = {
                user_id: userCredential.user.uid,
                name: formData.name,
                email: formData.email,
                document: formData.document || null,
                responsible_name: formData.responsible_name || null,
                responsible_surname: formData.responsible_surname || null,
                address: formData.address || null,
                phonenumber: formData.phonenumber || null,
                segment: formData.segment || null,
                manager_id: user.uid,
                created_at: serverTimestamp(),
                updated_at: serverTimestamp(),
                deleted_at: null
            };
            
            await addDoc(collection(db, 'clients'), clientData);

            toast({
                title: "Success",
                description: "Client created successfully!",
            });
            
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error creating client:", error);
            
            // Handle specific Firebase auth errors
            if (error.code === 'auth/email-already-in-use') {
                toast({
                    title: "Error",
                    description: "This email is already registered. Please use a different email.",
                    variant: "destructive",
                });
            } else if (error.code === 'auth/invalid-email') {
                toast({
                    title: "Error",
                    description: "Please provide a valid email address.",
                    variant: "destructive",
                });
            } else if (error.code === 'auth/weak-password') {
                toast({
                    title: "Error",
                    description: "Password is too weak. Please use a stronger password.",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Error",
                    description: error.message || "Failed to create client.",
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
                    <DialogTitle>Create New Client</DialogTitle>
                    <DialogDescription>
                        Add a new client to your dashboard.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="name">Name*</Label>
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
                        <Label htmlFor="password">Password*</Label>
                        <Input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Password must be at least 6 characters long.
                        </p>
                    </div>
                    <div>
                        <Label htmlFor="document">Document</Label>
                        <Input
                            id="document"
                            name="document"
                            value={formData.document}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="responsible_name">Responsible Name</Label>
                            <Input
                                id="responsible_name"
                                name="responsible_name"
                                value={formData.responsible_name}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <Label htmlFor="responsible_surname">Responsible Surname</Label>
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
                            <Label htmlFor="phonenumber">Phone Number</Label>
                            <Input
                                id="phonenumber"
                                name="phonenumber"
                                value={formData.phonenumber}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <Label htmlFor="segment">Segment</Label>
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
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {loading ? "Creating..." : "Create Client"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}