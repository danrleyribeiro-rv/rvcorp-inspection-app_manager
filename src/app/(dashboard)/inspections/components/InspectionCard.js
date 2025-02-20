// src/app/(dashboard)/inspections/components/InspectionCard.js
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Eye, Calendar, User } from "lucide-react";

const getStatusColor = (status) => {
  const statusColors = {
    pending: "yellow",
    in_progress: "blue",
    completed: "green",
    canceled: "red"
  };
  return statusColors[status] || "gray";
};

export default function InspectionCard({ inspection, onEdit, onView }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{inspection.projectName}</CardTitle>
          <Badge variant={getStatusColor(inspection.status)}>
            {inspection.status === "pending" && "Pendente"}
            {inspection.status === "in_progress" && "Em Andamento"}
            {inspection.status === "completed" && "Concluída"}
            {inspection.status === "canceled" && "Cancelada"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(inspection.scheduledDate), "PPP", { locale: ptBR })}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{inspection.inspectorName}</span>
          </div>

          {inspection.templateName && (
            <div className="text-sm text-muted-foreground">
              Template: {inspection.templateName}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            {inspection.completed && (
              <Button variant="outline" size="sm" onClick={onView}>
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}