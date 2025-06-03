// src/app/(dashboard)/inspections/components/InspectionListItem.js
"use client";

import { useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseCode } from "@/utils/codeGenerator";
import { 
  Pencil, 
  Eye, 
  Calendar, 
  User, 
  Trash2, 
  MapPin, 
  AlertTriangle, 
  FileText, 
  Edit, 
  ChevronDown, 
  ChevronRight,
  Clock,
  Hash
} from "lucide-react";

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

export default function InspectionListItem({ inspection, onEdit, onView, onDelete, onEditData, onEditInspection }) {
  const [expanded, setExpanded] = useState(false);

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
  const scheduledDateFormatted = inspection.scheduled_date ? formatDateSafe(inspection.scheduled_date) : null;
  const parsedCode = inspection.cod ? parseCode(inspection.cod) : null;

  return (
    <div className="border rounded-lg mb-3 overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Header - Always visible */}
      <div 
        className="flex items-center justify-between p-4 bg-background cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 flex-1">
          {expanded ? 
            <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" /> : 
            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          }
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              {inspection.cod && (
                <span className="font-mono text-xs bg-green-100 px-2 py-1 rounded">
                  {inspection.cod}
                </span>
              )}
              <h3 className="font-medium truncate">{inspection.title}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 mt-1 text-sm text-muted-foreground">
              {scheduledDateFormatted && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{scheduledDateFormatted}</span>
                </div>
              )}
              
              {inspection.projects && (
                <span>Projeto: {inspection.projects.title}</span>
              )}

              {inspection.inspectors && (
                <div className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  <span>{`${inspection.inspectors.name} ${inspection.inspectors.last_name || ''}`}</span>
                </div>
              )}

              {parsedCode && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{parsedCode.date}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
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
              Problemas
            </Badge>
          )}
        </div>
      </div>
      
      {/* Expanded content */}
      {expanded && (
        <div className="p-4 pt-0 border-t mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div className="space-y-2">
              {addressText && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{addressText}</span>
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

              {inspection.template_id && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Template:</span> {inspection.template_id}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              {inspection.observation && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Observação:</span> 
                  <p className="line-clamp-3">{inspection.observation}</p>
                </div>
              )}

              {parsedCode && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Sequência do dia:</span> #{parsedCode.sequence}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4 mt-2 border-t">
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
      )}
    </div>
  );
}