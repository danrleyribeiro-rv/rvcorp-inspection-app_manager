"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Mail, Building, Phone, User, Edit } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ClientCard({ client }) {
    const router = useRouter();

    const getAvatarLetters = () => {
        const name = client.name || '';
        return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
    };

    const handleEdit = () => {
        router.push(`/clients/edit/${client.id}`);
    };

    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={client.profileImageUrl} />
                        <AvatarFallback className="text-lg bg-primary/10">
                            {getAvatarLetters()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <CardTitle className="text-lg">
                            {client.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Mail className="h-4 w-4" />
                            <span>{client.email}</span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div className="space-y-2">
                        {client.phonenumber && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <span>{client.phonenumber}</span>
                            </div>
                        )}
                        {client.city && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                <span>{client.city}, {client.state}</span>
                            </div>
                        )}
                        {client.document && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Building className="h-4 w-4" />
                                <span>{client.document}</span>
                            </div>
                        )}
                        {client.responsible_name && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="h-4 w-4" />
                                <span>{client.responsible_name} {client.responsible_surname}</span>
                            </div>
                        )}
                    </div>

                    {client.segment && (
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="text-xs">
                                {client.segment}
                            </Badge>
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <Button onClick={handleEdit} variant="outline" className="flex-1">
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}