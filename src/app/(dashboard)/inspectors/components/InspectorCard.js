
// app/(dashboard)/inspectors/components/InspectorCard.js
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MessageCircle, MapPin, Building } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; 

export default function InspectorCard({ inspector, onRate, onChat }) {
  const getAvatarLetters = () => {
    const name = inspector.name || '';
    const lastName = inspector.last_name || '';
    return `${name.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={inspector.profile_images?.[0]?.url} />
              <AvatarFallback>{getAvatarLetters()}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-lg">
              {inspector.name} {inspector.last_name || ''}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span>{parseFloat(inspector.rating || 0).toFixed(1)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            {inspector.city && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{inspector.city}</span>
              </div>
            )}
            {inspector.state && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building className="h-4 w-4" />
                <span>{inspector.state}</span>
              </div>
            )}
          </div>

          {inspector.profession && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Profissão:</span> {inspector.profession}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {inspector.training?.map((specialty) => (
              <span
                key={specialty}
                className="px-2 py-1 bg-primary/10 rounded-full text-xs"
              >
                {specialty}
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={onRate} variant="outline" className="flex-1">
              <Star className="mr-2 h-4 w-4" />
              Avaliar
            </Button>
            <Button onClick={onChat} variant="outline" className="flex-1">
              <MessageCircle className="mr-2 h-4 w-4" />
              Chat
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

      