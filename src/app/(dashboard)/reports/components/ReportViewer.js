// src/app/(dashboard)/reports/components/ReportViewer.js
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  FileText,
  AlertTriangle,
  CheckCircle,
  X,
  Calendar,
  MapPin,
  User,
  Package,
  ChevronDown
} from "lucide-react";
import { getInternalStatus, getInternalStatusText, getInternalStatusColor } from "@/utils/inspection-status";

export default function ReportViewer({ inspection, open, onClose, onGeneratePreview, onGenerateNCPDF, onGenerateHTMLReport, onViewHTMLReport }) {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  const getNonConformities = () => {
    const ncs = [];
    if (!inspection.topics) return ncs;

    inspection.topics.forEach((topic, topicIndex) => {
      if (topic.items) {
        topic.items.forEach((item, itemIndex) => {
          if (item.details) {
            item.details.forEach((detail, detailIndex) => {
              if (detail.non_conformities) {
                detail.non_conformities.forEach((nc, ncIndex) => {
                  ncs.push({
                    ...nc,
                    path: `${topic.name} → ${item.name} → ${detail.name}`,
                    location: { topicIndex, itemIndex, detailIndex, ncIndex }
                  });
                });
              }
            });
          }
        });
      }
    });

    return ncs;
  };

  const formatAddress = (address) => {
    if (!address) return "Endereço não informado";
    
    const parts = [];
    if (address.street) {
      let streetPart = address.street;
      if (address.number) streetPart += `, ${address.number}`;
      parts.push(streetPart);
    }
    if (address.complement) parts.push(address.complement);
    if (address.neighborhood) parts.push(address.neighborhood);
    if (address.city && address.state) {
      parts.push(`${address.city} - ${address.state}`);
    }
    
    return parts.length > 0 ? parts.join(", ") : "Endereço não informado";
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'baixa': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'média': 'bg-orange-100 text-orange-800 border-orange-200',
      'alta': 'bg-red-100 text-red-800 border-red-200',
      'crítica': 'bg-purple-100 text-purple-800 border-purple-200',
      'resolved': 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[severity?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const nonConformities = getNonConformities();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-3 border-b"> {/* Reduzido padding */}
        <div className="flex items-center justify-between">
            <div>
            <DialogTitle className="text-lg">{inspection.title}</DialogTitle> {/* Reduzido de text-xl */}
            {inspection.cod && (
                <p className="text-xs text-muted-foreground font-mono mt-1"> {/* Reduzido */}
                {inspection.cod}
                </p>
            )}
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="primary">
                    <Download className="mr-2 h-4 w-4" />
                    Gerar Relatório
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Relatório Completo (PDF)</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => onGeneratePreview(inspection, null)}>
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Preview PDF Completo</span>
                  </DropdownMenuItem>
                  {inspection.releases?.map((release, index) => (
                    <DropdownMenuItem key={release.id} onClick={() => onGeneratePreview(inspection, release)}>
                      <Package className="mr-2 h-4 w-4" />
                      <span>PDF Release V{release.version}</span>
                    </DropdownMenuItem>
                  ))}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuLabel>Relatório de Não Conformidades (PDF)</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => onGenerateNCPDF(inspection, null)}>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    <span>Preview PDF de NCs</span>
                  </DropdownMenuItem>
                   {inspection.releases?.map((release, index) => (
                    <DropdownMenuItem key={release.id} onClick={() => onGenerateNCPDF(inspection, release)}>
                      <Package className="mr-2 h-4 w-4" />
                      <span>PDF NCs do Release V{release.version}</span>
                    </DropdownMenuItem>
                  ))}
                  
                  {onGenerateHTMLReport && onViewHTMLReport && (
                    <>
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuLabel>Relatório HTML</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onViewHTMLReport(inspection, 'complete')}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Visualizar HTML Completo</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onGenerateHTMLReport(inspection, 'complete')}>
                        <Download className="mr-2 h-4 w-4" />
                        <span>Baixar HTML Completo</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onViewHTMLReport(inspection, 'nonconformities')}>
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        <span>Visualizar HTML de NCs</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onGenerateHTMLReport(inspection, 'nonconformities')}>
                        <Download className="mr-2 h-4 w-4" />
                        <span>Baixar HTML de NCs</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
        </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1">
          <div className="px-6 border-b">
            <TabsList>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="structure">Estrutura</TabsTrigger>
              <TabsTrigger value="non-conformities">
                Não Conformidades ({nonConformities.length})
              </TabsTrigger>
              <TabsTrigger value="releases">
                Releases ({inspection.releases?.length || 0})
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[60vh]">
<TabsContent value="overview" className="p-6 space-y-6">
             {/* Informações Básicas */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-4">
                 <h3 className="text-lg font-semibold">Informações da Inspeção</h3>
                 
                 <div className="space-y-3">
                   <div className="flex items-center gap-2">
                     <Calendar className="h-4 w-4 text-muted-foreground" />
                     <div>
                       <span className="font-medium">Criada em:</span>
                       <span className="ml-2">{formatDate(inspection.created_at)}</span>
                     </div>
                   </div>

                   <div className="flex items-center gap-2">
                     <MapPin className="h-4 w-4 text-muted-foreground" />
                     <div>
                       <span className="font-medium">Endereço:</span>
                       <span className="ml-2">{formatAddress(inspection.address)}</span>
                     </div>
                   </div>

                   {inspection.area && (
                     <div>
                       <span className="font-medium">Área:</span>
                       <span className="ml-2">{inspection.area} m²</span>
                     </div>
                   )}

                   <div>
                     <span className="font-medium">Status:</span>
                     <Badge className={`ml-2 ${getInternalStatusColor(getInternalStatus(inspection))}`}>
                       {getInternalStatusText(getInternalStatus(inspection))}
                     </Badge>
                   </div>
                 </div>

                 {inspection.observation && (
                   <div>
                     <h4 className="font-medium mb-2">Observações</h4>
                     <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">
                       {inspection.observation}
                     </p>
                   </div>
                 )}
               </div>

               <div className="space-y-4">
                 <h3 className="text-lg font-semibold">Estatísticas</h3>
                 
                 <div className="space-y-4">
                   <div>
                     <div className="flex items-center justify-between mb-2">
                       <span className="text-sm font-medium">Completude</span>
                       <span className="text-sm font-medium">{inspection.completion}%</span>
                     </div>
                     <Progress value={inspection.completion} />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div className="text-center p-3 bg-blue-50 rounded">
                       <div className="text-2xl font-bold text-blue-600">
                         {inspection.topics?.length || 0}
                       </div>
                       <div className="text-sm text-blue-600">Tópicos</div>
                     </div>
                     
                     <div className="text-center p-3 bg-green-50 rounded">
                       <div className="text-2xl font-bold text-green-600">
                         {inspection.topics?.reduce((acc, topic) => 
                           acc + (topic.items?.length || 0), 0
                         ) || 0}
                       </div>
                       <div className="text-sm text-green-600">Itens</div>
                     </div>
                   </div>

                   {nonConformities.length > 0 && (
                     <div className="p-3 bg-red-50 rounded border border-red-200">
                       <div className="flex items-center gap-2 mb-2">
                         <AlertTriangle className="h-4 w-4 text-red-600" />
                         <span className="font-medium text-red-600">
                           {nonConformities.length} Não Conformidade{nonConformities.length !== 1 ? 's' : ''}
                         </span>
                       </div>
                       <div className="text-sm text-red-600">
                         Requer atenção especial
                       </div>
                     </div>
                   )}
                 </div>
               </div>
             </div>

             {/* Status de Entrega */}
             {inspection.delivered && (
               <div className="p-4 bg-green-50 rounded border border-green-200">
                 <div className="flex items-center gap-2">
                   <CheckCircle className="h-5 w-5 text-green-600" />
                   <span className="font-medium text-green-600">
                     Relatório Entregue
                   </span>
                 </div>
                 {inspection.delivered_at && (
                   <p className="text-sm text-green-600 mt-1">
                     Entregue em: {formatDate(inspection.delivered_at)}
                   </p>
                 )}
               </div>
             )}
           </TabsContent>

           <TabsContent value="structure" className="p-6">
             <div className="space-y-6">
               {inspection.topics?.map((topic, topicIndex) => (
                 <div key={topicIndex} className="border rounded-lg p-4">
                   <div className="flex items-center justify-between mb-3">
                     <h3 className="text-lg font-semibold">{topic.name}</h3>
                     <Badge variant="outline">
                       {topic.items?.length || 0} ite{(topic.items?.length || 0) !== 1 ? 'ns' : 'm'}
                     </Badge>
                   </div>
                   
                   {topic.description && (
                     <p className="text-sm text-muted-foreground mb-3">
                       {topic.description}
                     </p>
                   )}

                   {topic.items && topic.items.length > 0 ? (
                     <div className="space-y-3">
                       {topic.items.map((item, itemIndex) => (
                         <div key={itemIndex} className="border-l-2 border-gray-200 pl-4">
                           <div className="flex items-center justify-between mb-2">
                             <h4 className="font-medium">{item.name}</h4>
                             <Badge variant="secondary" className="text-xs">
                               {item.details?.length || 0} detalhe{(item.details?.length || 0) !== 1 ? 's' : ''}
                             </Badge>
                           </div>
                           
                           {item.description && (
                             <p className="text-sm text-muted-foreground mb-2">
                               {item.description}
                             </p>
                           )}

                           {item.details && item.details.length > 0 && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                               {item.details.map((detail, detailIndex) => (
                                 <div key={detailIndex} className="bg-gray-50 p-2 rounded text-sm">
                                   <div className="flex items-center justify-between">
                                     <span className="font-medium">{detail.name}</span>
                                     <div className="flex items-center gap-1">
                                       {detail.required && (
                                         <Badge variant="outline" className="text-xs">Obr.</Badge>
                                       )}
                                       {detail.is_damaged && (
                                         <Badge variant="destructive" className="text-xs">Dano</Badge>
                                       )}
                                     </div>
                                   </div>
                                   {detail.value && (
                                     <div className="mt-1">
                                       <span className="text-muted-foreground">Valor: </span>
                                       <span>{detail.value}</span>
                                     </div>
                                   )}
                                   {detail.non_conformities && detail.non_conformities.length > 0 && (
                                     <div className="mt-1">
                                       <Badge variant="destructive" className="text-xs">
                                         {detail.non_conformities.length} NC{detail.non_conformities.length !== 1 ? 's' : ''}
                                       </Badge>
                                     </div>
                                   )}
                                 </div>
                               ))}
                             </div>
                           )}
                         </div>
                       ))}
                     </div>
                   ) : (
                     <p className="text-sm text-muted-foreground">
                       Nenhum item neste tópico.
                     </p>
                   )}
                 </div>
               ))}
             </div>
           </TabsContent>

           <TabsContent value="non-conformities" className="p-6">
             <div className="space-y-4">
               {nonConformities.length === 0 ? (
                 <div className="text-center py-8">
                   <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                   <h3 className="text-lg font-medium mb-2">Nenhuma Não Conformidade</h3>
                   <p className="text-muted-foreground">
                     Esta inspeção não possui não conformidades registradas.
                   </p>
                 </div>
               ) : (
                 nonConformities.map((nc, index) => (
                   <div key={index} className="border rounded-lg p-4">
                     <div className="flex items-center justify-between mb-3">
                       <div>
                         <h4 className="font-medium">NC #{index + 1}</h4>
                         <p className="text-sm text-muted-foreground">{nc.path}</p>
                       </div>
                       <div className="flex items-center gap-2">
                         <Badge className={getSeverityColor(nc.severity)}>
                           {nc.severity}
                         </Badge>
                         <Badge variant={
                           nc.status === 'resolvida' ? 'default' : 
                           nc.status === 'em_andamento' ? 'secondary' : 'destructive'
                         }>
                           {nc.status === 'pendente' && 'Pendente'}
                           {nc.status === 'em_andamento' && 'Em Andamento'}
                           {nc.status === 'resolvida' && 'Resolvida'}
                         </Badge>
                       </div>
                     </div>

                     <div className="space-y-3">
                       <div>
                         <span className="font-medium">Descrição:</span>
                         <p className="text-sm text-muted-foreground mt-1">{nc.description}</p>
                       </div>

                       {nc.corrective_action && (
                         <div>
                           <span className="font-medium">Ação Corretiva:</span>
                           <p className="text-sm text-muted-foreground mt-1">{nc.corrective_action}</p>
                         </div>
                       )}

                       {nc.deadline && (
                         <div>
                           <span className="font-medium">Prazo:</span>
                           <span className="text-sm text-muted-foreground ml-2">
                             {formatDate(nc.deadline)}
                           </span>
                         </div>
                       )}

                       {nc.media && nc.media.length > 0 && (
                         <div>
                           <span className="font-medium">Mídia Anexada:</span>
                           <div className="flex gap-2 mt-1">
                             {nc.media.map((media, mediaIndex) => (
                               <Badge key={mediaIndex} variant="outline" className="text-xs">
                                 {media.type === 'image' ? '📷' : '🎥'} {media.type}
                               </Badge>
                             ))}
                           </div>
                         </div>
                       )}
                     </div>
                   </div>
                 ))
               )}
             </div>
           </TabsContent>

           <TabsContent value="releases" className="p-6">
             <div className="space-y-4">
               {(!inspection.releases || inspection.releases.length === 0) ? (
                 <div className="text-center py-8">
                   <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                   <h3 className="text-lg font-medium mb-2">Nenhum Release</h3>
                   <p className="text-muted-foreground">
                     Ainda não foram criados releases para esta inspeção.
                   </p>
                 </div>
               ) : (
                 inspection.releases.map((release, index) => (
                   <div key={release.id} className="border rounded-lg p-4">
                     <div className="flex items-center justify-between mb-3">
                       <div>
                         <h4 className="font-medium">Release #{index + 1}</h4>
                         <p className="text-sm text-muted-foreground">
                           Versão: {release.version}
                         </p>
                       </div>
                       <div className="flex items-center gap-2">
                         <Badge variant={release.is_delivered ? 'default' : 'secondary'}>
                           {release.is_delivered ? 'Entregue' : 'Não Entregue'}
                         </Badge>
                       </div>
                     </div>

                     <div className="space-y-2">
                       <div>
                         <span className="font-medium">Criado em:</span>
                         <span className="text-sm text-muted-foreground ml-2">
                           {formatDate(release.created_at)}
                         </span>
                       </div>

                       {release.is_delivered && release.delivered_at && (
                         <div>
                           <span className="font-medium">Entregue em:</span>
                           <span className="text-sm text-muted-foreground ml-2">
                             {formatDate(release.delivered_at)}
                           </span>
                         </div>
                       )}

                       {release.release_notes && (
                         <div>
                           <span className="font-medium">Observações:</span>
                           <p className="text-sm text-muted-foreground mt-1 bg-gray-50 p-2 rounded">
                             {release.release_notes}
                           </p>
                         </div>
                       )}
                     </div>
                   </div>
                 ))
               )}
             </div>
           </TabsContent>
         </ScrollArea>
       </Tabs>
     </DialogContent>
   </Dialog>
 );
}