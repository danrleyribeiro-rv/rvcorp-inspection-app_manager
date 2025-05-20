// src/app/(dashboard)/inspections/components/InspectionCard.js
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, isValid, parseISO } from "date-fns"; // Importar isValid e parseISO
import { ptBR } from "date-fns/locale";
import { Pencil, Eye, Calendar, User, Trash2, MapPin, AlertTriangle, FileText, Edit } from "lucide-react";

// Função para formatar datas com verificação de validade
const formatDateSafe = (dateStr) => {
  if (!dateStr) return null;
  
  try {
    let date;
    
    // Se for string, tentar converter para data
    if (typeof dateStr === 'string') {
      date = parseISO(dateStr);
    } else if (dateStr instanceof Date) {
      date = dateStr;
    } else {
      return null;
    }
    
    // Verificar se a data é válida
    if (!isValid(date)) {
      return null;
    }
    
    return format(date, "PPP", { locale: ptBR });
  } catch (error) {
    console.error("Erro ao formatar data:", error, dateStr);
    return null;
  }
};

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

export default function InspectionCard({ inspection, onEdit, onView, onDelete, onEditData, onEditInspection }) {
  // Count non-conformities
  const getNonConformitiesCount = () => {
    if (!inspection.topics) return 0;
    
    let count = 0;
    inspection.topics.forEach(topic => {
      if (topic.items) {
        topic.items.forEach(item => {
          if (item.details) {
            item.details.forEach(detail => {
              if (detail.non_conformities && detail.non_conformities.length > 0) {
                count += detail.non_conformities.length;
              }
            });
          }
        });
      }
    });
    
    return count;
  };

  // Check if there are damaged items
  const hasDamagedItems = () => {
    if (!inspection.topics) return false;
    
    return inspection.topics.some(topic => 
      topic.items && topic.items.some(item =>
        item.details && item.details.some(detail => detail.is_damaged)
      )
    );
  };

  // Count topics and items
  const getTopicsAndItemsCount = () => {
    if (!inspection.topics) return { topics: 0, items: 0 };
    
    const topics = inspection.topics.length;
    const items = inspection.topics.reduce((acc, topic) => 
      acc + (topic.items ? topic.items.length : 0), 0
    );
    
    return { topics, items };
  };

  const formatAddress = (address) => {
    if (!address) return null;
    
    const parts = [];
    if (address.street) {
      let streetPart = address.street;
      if (address.number) streetPart += `, ${address.number}`;
      parts.push(streetPart);
    }
    if (address.neighborhood) parts.push(address.neighborhood);
    if (address.city) parts.push(address.city);
    
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const nonConformitiesCount = getNonConformitiesCount();
  const damaged = hasDamagedItems();
  const { topics, items } = getTopicsAndItemsCount();
  const addressText = formatAddress(inspection.address);
  
  // Formatar a data de forma segura
  const scheduledDateFormatted = inspection.scheduled_date ? formatDateSafe(inspection.scheduled_date) : null;

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg line-clamp-2">{inspection.title}</CardTitle>
          <div className="flex flex-col gap-1 items-end">
            <Badge variant={getStatusColor(inspection.status)}>
              {getStatusText(inspection.status)}
            </Badge>
            {nonConformitiesCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {nonConformitiesCount} NC{nonConformitiesCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {damaged && (
              <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                Problemas identificados
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {scheduledDateFormatted && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{scheduledDateFormatted}</span>
            </div>
          )}

          {inspection.inspectors && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>
                {`${inspection.inspectors.name} ${inspection.inspectors.last_name || ''}`}
              </span>
            </div>
          )}

          {addressText && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{addressText}</span>
            </div>
          )}

          {inspection.projects && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Projeto:</span> {inspection.projects.title}
            </div>
          )}

          {inspection.projects?.clients && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Cliente:</span> {inspection.projects.clients.name}
            </div>
          )}

          {topics > 0 && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Progresso:</span> {topics} tópico{topics !== 1 ? 's' : ''}, {items} ite{items !== 1 ? 'ns' : 'm'}
            </div>
          )}

          {inspection.observation && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Observação:</span> 
              <span className="line-clamp-2 ml-1">{inspection.observation}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={onView}>
              <Eye className="h-4 w-4 mr-2" />
              Ver
            </Button>
            <Button variant="outline" size="sm" onClick={onEditData}>
              <FileText className="h-4 w-4 mr-2" />
              Info
            </Button>
            <Button variant="outline" size="sm" onClick={onEditInspection}>
              <Edit className="h-4 w-4 mr-2" />
              Vistoria
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2 text-destructive" />
              Excluir
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}