
// app/(dashboard)/inspections/components/InspectionCard.js
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Eye, Calendar, User } from "lucide-react";

const getStatusColor = (status) => {
  const statusColors = {
    "pending": "yellow",
    "in_progress": "blue",
    "completed": "green",
    "canceled": "red"
  };
  return statusColors[status] || "gray";
};

const getStatusText = (status) => {
  const statusMap = {
    "pending": "Pendente",
    "in_progress": "Em Andamento",
    "completed": "Concluída",
    "canceled": "Cancelada"
  };
  return statusMap[status] || status;
};

export default function InspectionCard({ inspection, onEdit, onView }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{inspection.title}</CardTitle>
          <Badge variant={getStatusColor(inspection.status)}>
            {getStatusText(inspection.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {inspection.scheduled_date ? 
                format(new Date(inspection.scheduled_date), "PPP", { locale: ptBR }) : 
                "Não agendada"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>
              {inspection.inspectors ? 
                `${inspection.inspectors.name} ${inspection.inspectors.last_name || ''}` : 
                "Sem vistoriador"}
            </span>
          </div>

          {inspection.projects && (
            <div className="text-sm text-muted-foreground">
              Projeto: {inspection.projects.title}
            </div>
          )}

          {inspection.clients && (
            <div className="text-sm text-muted-foreground">
              Cliente: {inspection.clients.name}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={onView}>
              <Eye className="h-4 w-4 mr-2" />
              Visualizar
            </Button>
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