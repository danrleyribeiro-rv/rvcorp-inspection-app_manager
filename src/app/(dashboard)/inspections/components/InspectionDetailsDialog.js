// app/(dashboard)/inspections/components/InspectionDetailsDialog.js
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarIcon,
  FileText,
  User,
  MapPin,
  FileCode,
  ScrollText,
  Home
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const getStatusBadge = (status) => {
  const statusMap = {
    pending: { label: "Pendente", variant: "yellow" },
    in_progress: { label: "Em Andamento", variant: "blue" },
    completed: { label: "Concluída", variant: "green" },
    canceled: { label: "Cancelada", variant: "red" },
  };
  return statusMap[status] || { label: status, variant: "gray" };
};

export default function InspectionDetailsDialog({ inspection, open, onClose }) {
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [projectDetails, setProjectDetails] = useState(null);
  const [inspectorDetails, setInspectorDetails] = useState(null);
  const [templateDetails, setTemplateDetails] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (inspection?.id) {
      fetchDetails();
    }
  }, [inspection]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      // Fetch rooms
      const roomsQuery = query(
        collection(db, 'rooms'),
        where('inspection_id', '==', inspection.id)
      );
      
      const roomsSnapshot = await getDocs(roomsQuery);
      const roomsData = roomsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // For each room, fetch its items
      for (const room of roomsData) {
        // Verificar se room_id existe antes de usá-lo na consulta
        if (room.room_id) {
          const itemsQuery = query(
            collection(db, 'room_items'),
            where('inspection_id', '==', inspection.id),
            where('room_id', '==', room.room_id)
          );
          
          const itemsSnapshot = await getDocs(itemsQuery);
          room.room_items = itemsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        } else {
          // Se room_id não existir, inicializar room_items como um array vazio
          room.room_items = [];
        }
      }
      
      setRooms(roomsData);
      
      // Fetch project details
      if (inspection.project_id) {
        const projectRef = doc(db, 'projects', inspection.project_id);
        const projectDoc = await getDoc(projectRef);
        
        if (projectDoc.exists()) {
          const projectData = {
            id: projectDoc.id,
            ...projectDoc.data()
          };
          
          // Get client data if available
          if (projectData.client_id) {
            const clientRef = doc(db, 'clients', projectData.client_id);
            const clientDoc = await getDoc(clientRef);
            
            if (clientDoc.exists()) {
              projectData.clients = {
                id: clientDoc.id,
                ...clientDoc.data()
              };
            }
          }
          
          setProjectDetails(projectData);
        }
      }
      
      // Fetch inspector details
      if (inspection.inspector_id) {
        const inspectorRef = doc(db, 'inspectors', inspection.inspector_id);
        const inspectorDoc = await getDoc(inspectorRef);
        
        if (inspectorDoc.exists()) {
          setInspectorDetails({
            id: inspectorDoc.id,
            ...inspectorDoc.data()
          });
        }
      }
      
      // Fetch template details
      if (inspection.template_id) {
        const templateRef = doc(db, 'templates', inspection.template_id);
        const templateDoc = await getDoc(templateRef);
        
        if (templateDoc.exists()) {
          setTemplateDetails({
            id: templateDoc.id,
            ...templateDoc.data()
          });
        }
      }
    } catch (error) {
      console.error("Error fetching inspection details:", error);
      toast({
        title: "Erro ao carregar detalhes",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDateSafely = (dateString) => {
    try {
      if (!dateString) return "Data não definida";
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Data inválida";
      }
      
      return format(date, "PPP", { locale: ptBR });
    } catch (error) {
      console.error("Error formatting date:", error, dateString);
      return "Data inválida";
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Carregando detalhes...</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const status = getStatusBadge(inspection.status);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{inspection.title}</span>
            <Badge variant={status.variant}>{status.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="overflow-hidden h-[calc(100%-4rem)]">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="rooms">
              Dependências ({rooms.length})
            </TabsTrigger>
            {templateDetails && (
              <TabsTrigger value="template">Template</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="overflow-auto h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detalhes da Inspeção</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {inspection.observation && (
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Observação</p>
                        <p className="text-sm text-muted-foreground">{inspection.observation}</p>
                      </div>
                    </div>
                  )}
                  
                  {inspection.scheduled_date && (
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Data Agendada</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateSafely(inspection.scheduled_date)}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <ScrollText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Criado em</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateSafely(inspection.created_at)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {projectDetails && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Projeto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-2">
                      <FileCode className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Título</p>
                        <p className="text-sm text-muted-foreground">{projectDetails.title}</p>
                      </div>
                    </div>
                    
                    {projectDetails.description && (
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Descrição</p>
                          <p className="text-sm text-muted-foreground">{projectDetails.description}</p>
                        </div>
                      </div>
                    )}
                    
                    {projectDetails.clients && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Cliente</p>
                          <p className="text-sm text-muted-foreground">{projectDetails.clients.name}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {inspectorDetails && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Vistoriador</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Nome</p>
                        <p className="text-sm text-muted-foreground">
                          {`${inspectorDetails.name} ${inspectorDetails.last_name || ''}`}
                        </p>
                      </div>
                    </div>
                    
                    {inspectorDetails.email && (
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                          <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                        <div>
                          <p className="font-medium">Email</p>
                          <p className="text-sm text-muted-foreground">{inspectorDetails.email}</p>
                        </div>
                      </div>
                    )}
                    
                    {inspectorDetails.phonenumber && (
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                        <div>
                          <p className="font-medium">Telefone</p>
                          <p className="text-sm text-muted-foreground">{inspectorDetails.phonenumber}</p>
                        </div>
                      </div>
                    )}
                    
                    {(inspectorDetails.city || inspectorDetails.state) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Localização</p>
                          <p className="text-sm text-muted-foreground">
                            {[inspectorDetails.city, inspectorDetails.state].filter(Boolean).join(", ")}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {templateDetails && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Template</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-2">
                      <FileCode className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Título</p>
                        <p className="text-sm text-muted-foreground">{templateDetails.title}</p>
                      </div>
                    </div>
                    
                    {templateDetails.description && (
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Descrição</p>
                          <p className="text-sm text-muted-foreground">{templateDetails.description}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Salas</p>
                        <p className="text-sm text-muted-foreground">
                          {templateDetails.rooms?.length || 0} tópicos definidas
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="rooms" className="overflow-auto h-full">
            {rooms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma dependência encontrada para esta inspeção.
              </div>
            ) : (
              <div className="space-y-6">
                {rooms.map((room) => (
                  <Card key={room.id}>
                    <CardHeader>
                      <CardTitle>{room.room_name}</CardTitle>
                      {room.room_label && (
                        <CardDescription>{room.room_label}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      {room.observation && (
                        <div className="mb-4">
                          <p className="font-medium">Observação</p>
                          <p className="text-sm text-muted-foreground">{room.observation}</p>
                        </div>
                      )}
                      
                      {room.is_damaged && (
                        <Badge variant="red" className="mb-4">Danificado</Badge>
                      )}
                      
                      {room.room_items && room.room_items.length > 0 ? (
                        <div>
                          <h3 className="font-medium mb-2">Itens ({room.room_items.length})</h3>
                          <div className="space-y-3">
                            {room.room_items.map((item) => (
                              <div key={item.id} className="border p-3 rounded-md">
                                <p className="font-medium">{item.item_name}</p>
                                {item.item_label && (
                                  <p className="text-sm text-muted-foreground">{item.item_label}</p>
                                )}
                                {item.observation && (
                                  <p className="text-sm mt-1">{item.observation}</p>
                                )}
                                {item.is_damaged && (
                                  <Badge variant="red" className="mt-2">Danificado</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhum item nesta dependência.</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {templateDetails && (
            <TabsContent value="template" className="overflow-auto h-full">
              <Card>
                <CardHeader>
                  <CardTitle>{templateDetails.title}</CardTitle>
                  <CardDescription>{templateDetails.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {templateDetails.rooms && templateDetails.rooms.length > 0 ? (
                    <div className="space-y-6">
                      {templateDetails.rooms.map((room, index) => (
                        <div key={index} className="border p-4 rounded-md">
                          <h3 className="font-medium text-lg mb-2">{room.name}</h3>
                          {room.description && (
                            <p className="text-sm text-muted-foreground mb-4">{room.description}</p>
                          )}
                          
                          {room.items && room.items.length > 0 ? (
                            <div className="space-y-4">
                              <h4 className="font-medium">Itens</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {room.items.map((item, itemIndex) => (
                                  <div key={itemIndex} className="border p-3 rounded-md">
                                    <p className="font-medium">{item.name}</p>
                                    {item.description && (
                                      <p className="text-sm text-muted-foreground">{item.description}</p>
                                    )}
                                    
                                    {item.details && item.details.length > 0 && (
                                      <div className="mt-2">
                                        <h5 className="text-sm font-medium">Detalhes</h5>
                                        <ul className="text-xs mt-1 space-y-1">
                                          {item.details.map((detail, detailIndex) => (
                                            <li key={detailIndex}>
                                              {detail.name}
                                              {detail.required && <span className="text-red-500">*</span>}
                                              {detail.type && <span className="text-muted-foreground ml-1">({detail.type})</span>}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Nenhum item definido.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Nenhuma dependência definida neste template.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
        
        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}