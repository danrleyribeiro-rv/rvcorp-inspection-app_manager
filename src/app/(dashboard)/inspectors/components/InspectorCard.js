// src/app/(dashboard)/inspectors/components/InspectorCard.js
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MessageCircle, MapPin, Building } from "lucide-react";

export default function InspectorCard({ inspector, onRate, onChat }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-start">
          <span>{inspector.name}</span>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span>{inspector.rating?.toFixed(1) || "N/A"}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{inspector.city}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building className="h-4 w-4" />
              <span>{inspector.state}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {inspector.specialties?.map((specialty) => (
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