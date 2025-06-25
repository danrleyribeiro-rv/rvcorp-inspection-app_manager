// src/components/InspectionListDialog.jsx
"use client";

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Separator } from '@/components/ui/separator';
import { useNavigation } from '@/hooks/use-navigation';
import { 
  MapPin, Calendar, Users, FileText, Filter, X, 
  ExternalLink, Clock, Building, User
} from 'lucide-react';

const getStatusText = (status) => {
  const statusMap = {
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    completed: 'Concluída',
    canceled: 'Cancelada'
  };
  return statusMap[status] || status;
};

const getStatusColor = (status) => {
  const colorMap = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    canceled: 'bg-red-100 text-red-800'
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
};

export default function InspectionListDialog({ 
  open, 
  onClose, 
  inspections, 
  city, 
  state 
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { navigateTo } = useNavigation();

  const filteredInspections = useMemo(() => {
    return inspections.filter(inspection => {
      // Status filter
      if (statusFilter !== 'all' && inspection.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          inspection.title?.toLowerCase().includes(searchLower) ||
          inspection.cod?.toLowerCase().includes(searchLower) ||
          inspection.inspector_name?.toLowerCase().includes(searchLower) ||
          inspection.address_string?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [inspections, statusFilter, searchTerm]);

  const statusCounts = useMemo(() => {
    const counts = { all: inspections.length };
    inspections.forEach(inspection => {
      counts[inspection.status] = (counts[inspection.status] || 0) + 1;
    });
    return counts;
  }, [inspections]);

  const handleInspectionClick = (inspection) => {
    onClose();
    navigateTo(`/inspections/${inspection.id}/editor`);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setSearchTerm('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Inspeções em {city}, {state}
          </DialogTitle>
          <DialogDescription>
            {inspections.length} inspeção{inspections.length !== 1 ? 'ões' : ''} encontrada{inspections.length !== 1 ? 's' : ''} nesta localização
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 py-4 border-b">
          <div className="flex-1">
            <div className="relative">
              <Input
                placeholder="Buscar por título, código, inspetor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <FileText className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Todos ({statusCounts.all || 0})
                </SelectItem>
                <SelectItem value="pending">
                  Pendente ({statusCounts.pending || 0})
                </SelectItem>
                <SelectItem value="in_progress">
                  Em Andamento ({statusCounts.in_progress || 0})
                </SelectItem>
                <SelectItem value="completed">
                  Concluída ({statusCounts.completed || 0})
                </SelectItem>
                <SelectItem value="canceled">
                  Cancelada ({statusCounts.canceled || 0})
                </SelectItem>
              </SelectContent>
            </Select>

            {(statusFilter !== 'all' || searchTerm) && (
              <EnhancedButton
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="px-3"
              >
                <X className="h-4 w-4" />
              </EnhancedButton>
            )}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          Mostrando {filteredInspections.length} de {inspections.length} inspeções
        </div>

        {/* Inspections list */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-3">
            {filteredInspections.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhuma inspeção encontrada</p>
                <p className="text-sm">Tente ajustar os filtros para ver mais resultados</p>
              </div>
            ) : (
              filteredInspections.map((inspection) => (
                <Card 
                  key={inspection.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => handleInspectionClick(inspection)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base group-hover:text-primary transition-colors flex items-center gap-2">
                          {inspection.title || 'Vistoria'}
                          <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </CardTitle>
                        {inspection.cod && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Código: {inspection.cod}
                          </p>
                        )}
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={getStatusColor(inspection.status)}
                      >
                        {getStatusText(inspection.status)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {/* Location */}
                      <div className="flex items-start gap-2">
                        <Building className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">
                          {inspection.address_string || 
                           (inspection.address ? `${inspection.address.street}, ${inspection.address.number}` : '') ||
                           inspection.location || 
                           'Endereço não informado'}
                        </span>
                      </div>

                      {/* Date */}
                      {inspection.scheduled_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {new Date(inspection.scheduled_date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}

                      {/* Inspector */}
                      {inspection.inspector_name && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {inspection.inspector_name}
                          </span>
                        </div>
                      )}

                      {/* Area */}
                      {inspection.area && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            Área: {inspection.area}m²
                          </span>
                        </div>
                      )}

                      {/* Created date */}
                      {inspection.created_at && (
                        <div className="flex items-center gap-2 col-span-1 sm:col-span-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Criada em {new Date(inspection.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                    </div>

                    {inspection.observation && (
                      <>
                        <Separator className="my-3" />
                        <div className="text-sm text-muted-foreground">
                          <p className="line-clamp-2">
                            {inspection.observation}
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer with actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Clique em uma inspeção para abrir o editor
          </div>
          <EnhancedButton variant="outline" onClick={onClose}>
            Fechar
          </EnhancedButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}