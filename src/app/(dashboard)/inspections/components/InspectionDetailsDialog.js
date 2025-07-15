// app/(dashboard)/inspections/components/InspectionDetailsDialog.js
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarIcon,
  FileText,
  User,
  MapPin,
  FileCode,
  Home,
  Clipboard,
  Pencil,
  AlertTriangle,
  Image as ImageIcon,
  Video,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

import DeliveryStatus from "@/components/inspection/DeliveryStatus";
import { Lock, GitCommit, Package } from "lucide-react";

const getStatusBadge = (status) => {
  const statusMap = {
    pending: { label: "Pendente", variant: "yellow" },
    in_progress: { label: "Em Andamento", variant: "blue" },
    completed: { label: "Concluída", variant: "green" },
    canceled: { label: "Cancelada", variant: "red" },
  };
  return statusMap[status] || { label: status, variant: "gray" };
};

const getSeverityColor = (severity) => {
  const colors = {
    Baixa: "bg-green-100 text-green-800",
    Média: "bg-yellow-100 text-yellow-800",
    Alta: "bg-red-100 text-red-800",
    Crítica: "bg-red-600 text-white",
  };
  return colors[severity] || "bg-gray-100 text-gray-800";
};

const getNCStatusColor = (status) => {
  const colors = {
    pendente: "bg-yellow-100 text-yellow-800",
    em_andamento: "bg-blue-100 text-blue-800",
    resolvida: "bg-green-100 text-green-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

export default function InspectionDetailsDialog({
  inspection,
  open,
  onClose,
  onEdit,
}) {
  const [loading, setLoading] = useState(true);
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
      // Fetch project details
      if (inspection.project_id) {
        const projectRef = doc(db, "projects", inspection.project_id);
        const projectDoc = await getDoc(projectRef);

        if (projectDoc.exists()) {
          const projectData = {
            id: projectDoc.id,
            ...projectDoc.data(),
          };

          // Get client data if available
          if (projectData.client_id) {
            const clientRef = doc(db, "clients", projectData.client_id);
            const clientDoc = await getDoc(clientRef);

            if (clientDoc.exists()) {
              projectData.clients = {
                id: clientDoc.id,
                ...clientDoc.data(),
              };
            }
          }

          setProjectDetails(projectData);
        }
      }

      // Fetch inspector details
      if (inspection.inspector_id) {
        const inspectorRef = doc(db, "inspectors", inspection.inspector_id);
        const inspectorDoc = await getDoc(inspectorRef);

        if (inspectorDoc.exists()) {
          setInspectorDetails({
            id: inspectorDoc.id,
            ...inspectorDoc.data(),
          });
        }
      }

      // Fetch template details
      if (inspection.template_id) {
        const templateRef = doc(db, "templates", inspection.template_id);
        const templateDoc = await getDoc(templateRef);

        if (templateDoc.exists()) {
          setTemplateDetails({
            id: templateDoc.id,
            ...templateDoc.data(),
          });
        }
      }
    } catch (error) {
      console.error("Error fetching inspection details:", error);
      toast({
        title: "Erro ao carregar detalhes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDateSafely = (dateString) => {
    try {
      if (!dateString) return "Data não definida";
      const date = new Date(dateString);

      if (isNaN(date.getTime())) {
        return "Data inválida";
      }

      return format(date, "PPP", { locale: ptBR });
    } catch (error) {
      console.error("Error formatting date:", error, dateString);
      return "Data inválida";
    }
  };

  const formatAddress = (address) => {
    if (!address) return "Endereço não definido";

    const parts = [];
    if (address.street) {
      let streetPart = address.street;
      if (address.number) streetPart += `, ${address.number}`;
      parts.push(streetPart);
    }

    if (address.complement) parts.push(address.complement);
    if (address.neighborhood) parts.push(address.neighborhood);

    if (address.city || address.state) {
      let locationPart = [address.city, address.state]
        .filter(Boolean)
        .join(" - ");
      if (locationPart) parts.push(locationPart);
    }

    if (parts.length === 0) return "Endereço não definido";
    return parts.join(", ");
  };

  // Count non-conformities in all topics
  const getTotalNonConformities = () => {
    if (!inspection.topics) return 0;

    let total = 0;
    inspection.topics.forEach((topic) => {
      if (topic.items) {
        topic.items.forEach((item) => {
          if (item.details) {
            item.details.forEach((detail) => {
              if (detail.non_conformities && detail.non_conformities.length > 0) {
                total += detail.non_conformities.length;
              }
            });
          }
        });
      }
    });

    return total;
  };

  const getHighestSeverity = () => {
    const severities = ["Baixa", "Média", "Alta", "Crítica"];
    let highestIndex = -1;

    if (!inspection.topics) return null;

    inspection.topics.forEach((topic) => {
      if (topic.items) {
        topic.items.forEach((item) => {
          if (item.details) {
            item.details.forEach((detail) => {
              if (detail.non_conformities) {
                detail.non_conformities.forEach((nc) => {
                  const index = severities.indexOf(nc.severity);
                  if (index > highestIndex) {
                    highestIndex = index;
                  }
                });
              }
            });
          }
        });
      }
    });

    return highestIndex >= 0 ? severities[highestIndex] : null;
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(inspection);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
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
  const totalNCs = getTotalNonConformities();
  const highestSeverity = getHighestSeverity();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-2 sticky top-0 bg-background z-10 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              {inspection.title}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {totalNCs > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {totalNCs} NC{totalNCs !== 1 ? "s" : ""}
                </Badge>
              )}
              <Badge variant={status.variant}>{status.label}</Badge>
              <DeliveryStatus inspection={inspection} />
              {inspection.inspection_edit_blocked && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Edição Bloqueada
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="h-[calc(100vh-180px)]">
          <div className="px-6 border-b">
            <TabsList className="h-12">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="topics" className="flex items-center gap-2">
                <Clipboard className="h-4 w-4" />
                Tópicos ({inspection.topics?.length || 0})
              </TabsTrigger>
              {totalNCs > 0 && (
                <TabsTrigger
                  value="non-conformities"
                  className="flex items-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Não Conformidades ({totalNCs})
                </TabsTrigger>
              )}
              {templateDetails && (
                <TabsTrigger value="template" className="flex items-center gap-2">
                  <FileCode className="h-4 w-4" />
                  Template
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <div className="h-[calc(100%-48px)] overflow-hidden">
            <TabsContent value="overview" className="mt-0 h-full">
              <ScrollArea className="h-full px-4 py-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <p className="text-sm text-muted-foreground">
                              {inspection.observation}
                            </p>
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

                      {inspection.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Endereço</p>
                            <p className="text-sm text-muted-foreground">
                              {formatAddress(inspection.address)}
                            </p>
                            {inspection.address.cep && (
                              <p className="text-xs text-muted-foreground mt-1">
                                CEP: {inspection.address.cep}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {totalNCs > 0 && (
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive" />
                          <div>
                            <p className="font-medium">Não Conformidades</p>
                            <p className="text-sm text-muted-foreground">
                              {totalNCs} encontrada{totalNCs !== 1 ? "s" : ""}
                              {highestSeverity && (
                                <span
                                  className={`ml-2 px-2 py-1 rounded text-xs ${getSeverityColor(
                                    highestSeverity
                                  )}`}
                                >
                                  Maior severidade: {highestSeverity}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Criado em</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDateSafely(inspection.created_at)}
                          </p>
                        </div>
                      </div>

                      {/* Último editor */}
                      {inspection.last_editor && (
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Último Editor</p>
                            <p className="text-sm text-muted-foreground">
                              {inspection.last_editor}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Data de entrega */}
                      {inspection.delivered_at && (
                        <div className="flex items-start gap-2">
                          <Package className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Data de Entrega</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDateSafely(inspection.delivered_at)}
                            </p>
                          </div>
                        </div>
                      )}
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
                            <p className="text-sm text-muted-foreground">
                              {projectDetails.title}
                            </p>
                          </div>
                        </div>

                        {projectDetails.description && (
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Descrição</p>
                              <p className="text-sm text-muted-foreground">
                                {projectDetails.description}
                              </p>
                            </div>
                          </div>
                        )}

                        {projectDetails.clients && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Cliente</p>
                              <p className="text-sm text-muted-foreground">
                                {projectDetails.clients.name}
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {inspectorDetails && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Lincer</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Nome</p>
                            <p className="text-sm text-muted-foreground">
                              {`${inspectorDetails.name} ${inspectorDetails.last_name || ""
                                }`}
                            </p>
                          </div>
                        </div>

                        {inspectorDetails.email && (
                          <div className="flex items-center gap-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-muted-foreground"
                            >
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                              <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                            <div>
                              <p className="font-medium">Email</p>
                              <p className="text-sm text-muted-foreground">
                                {inspectorDetails.email}
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
                            <p className="text-sm text-muted-foreground">
                              {templateDetails.title}
                            </p>
                          </div>
                        </div>

                        {templateDetails.description && (
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Descrição</p>
                              <p className="text-sm text-muted-foreground">
                                {templateDetails.description}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Tópicos</p>
                            <p className="text-sm text-muted-foreground">
                              {templateDetails.topics?.length || 0} definidos no
                              template
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="topics" className="mt-0 h-full">
              <ScrollArea className="h-full px-6 py-4">
                {!inspection.topics || inspection.topics.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum tópico encontrado para esta inspeção.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {inspection.topics.map((topic, topicIndex) => (
                      <Card key={topicIndex}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle>{topic.name}</CardTitle>
                              {topic.description && (
                                <CardDescription className="mt-1">
                                  {topic.description}
                                </CardDescription>
                              )}
                            </div>
                            {topic.items &&
                              topic.items.some((item) =>
                                item.details
                                  ? item.details.some((detail) => detail.is_damaged)
                                  : false
                              ) && (
                                <Badge variant="destructive">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Problemas identificados
                                </Badge>
                              )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {topic.observation && (
                            <div className="mb-4">
                              <p className="font-medium">Observação do Tópico</p>
                              <p className="text-sm text-muted-foreground">
                                {topic.observation}
                              </p>
                            </div>
                          )}

                          {topic.items && topic.items.length > 0 ? (
                            <div>
                              <h3 className="font-medium mb-3">
                                Itens ({topic.items.length})
                              </h3>
                              <div className="space-y-4">
                                {topic.items.map((item, itemIndex) => (
                                  <div
                                    key={itemIndex}
                                    className="border p-4 rounded-md"
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <div>
                                        <h4 className="font-medium">{item.name}</h4>
                                        {item.description && (
                                          <p className="text-sm text-muted-foreground">
                                            {item.description}
                                          </p>
                                        )}
                                      </div>
                                      {item.details &&
                                        item.details.some(
                                          (detail) => detail.is_damaged
                                        ) && (
                                          <Badge variant="destructive">Danificado</Badge>
                                        )}
                                    </div>

                                    {item.observation && (
                                      <div className="mb-3">
                                        <p className="text-sm font-medium">
                                          Observação do Item
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          {item.observation}
                                        </p>
                                      </div>
                                    )}

                                    {item.details && item.details.length > 0 && (
                                      <div>
                                        <h5 className="font-medium mb-2">Detalhes</h5>
                                        <div className="space-y-3">
                                          {item.details.map((detail, detailIndex) => (
                                            <div
                                              key={detailIndex}
                                              className="bg-gray-50 p-3 rounded"
                                            >
                                              <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-sm">
                                                  {detail.name}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                  {detail.required && (
                                                    <Badge
                                                      variant="outline"
                                                      className="text-xs"
                                                    >
                                                      Obrigatório
                                                    </Badge>
                                                  )}
                                                  {detail.is_damaged && (
                                                    <Badge
                                                      variant="destructive"
                                                      className="text-xs"
                                                    >
                                                      Danificado
                                                    </Badge>
                                                  )}
                                                </div>
                                              </div>

                                              {detail.value && (
                                                <div className="mb-2">
                                                  <span className="text-sm font-medium">
                                                    Valor:{" "}
                                                  </span>
                                                  <span className="text-sm">
                                                    {detail.value}
                                                  </span>
                                                </div>
                                              )}

                                              {detail.observation && (
                                                <div className="mb-2">
                                                  <span className="text-sm font-medium">
                                                    Observação:{" "}
                                                  </span>
                                                  <span className="text-sm">
                                                    {detail.observation}
                                                  </span>
                                                </div>
                                              )}

                                              {detail.media && detail.media.length > 0 && (
                                                <div className="mb-2">
                                                  <span className="text-sm font-medium">
                                                    Mídia:{" "}
                                                  </span>
                                                  <div className="flex items-center gap-2 mt-1">
                                                    {detail.media.map(
                                                      (media, mediaIndex) => (
                                                        <div
                                                          key={mediaIndex}
                                                          className="flex items-center gap-1"
                                                        >
                                                          {media.type === "image" ? (
                                                            <ImageIcon className="h-4 w-4 text-blue-500" />
                                                          ) : (
                                                            <Video className="h-4 w-4 text-green-500" />
                                                          )}
                                                          <span className="text-xs">
                                                            {media.type}
                                                          </span>
                                                        </div>
                                                      )
                                                    )}
                                                  </div>
                                                </div>
                                              )}

                                              {detail.non_conformities &&
                                                detail.non_conformities.length > 0 && (
                                                  <div>
                                                    <Badge
                                                      variant="destructive"
                                                      className="text-xs"
                                                    >
                                                      {
                                                        detail.non_conformities.length
                                                      }{" "}
                                                      Não Conformidade
                                                      {
                                                        detail.non_conformities.length !==
                                                        1
                                                          ? "s"
                                                          : ""
                                                      }
                                                    </Badge>
                                                  </div>
                                                )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Nenhum item neste tópico.
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {totalNCs > 0 && (
              <TabsContent value="non-conformities" className="mt-0 h-full">
                <ScrollArea className="h-full px-6 py-4">
                  <div className="space-y-6">
                    {inspection.topics?.map((topic, topicIndex) =>
                      topic.items?.map((item, itemIndex) =>
                        item.details?.map((detail, detailIndex) =>
                          detail.non_conformities?.map((nc, ncIndex) => (
                            <Card key={`${topicIndex}-${itemIndex}-${detailIndex}-${ncIndex}`}>
                              <CardHeader>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <CardTitle className="text-lg">
                                      {topic.name} → {item.name} → {detail.name}
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                      Não Conformidade #{ncIndex + 1}
                                    </CardDescription>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge className={getSeverityColor(nc.severity)}>
                                      {nc.severity}
                                    </Badge>
                                    <Badge className={getNCStatusColor(nc.status)}>
                                      {nc.status === "pendente" && "Pendente"}
                                      {nc.status === "em_andamento" && "Em Andamento"}
                                      {nc.status === "resolvida" && "Resolvida"}
                                    </Badge>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div>
                                  <p className="font-medium">Descrição</p>
                                  <p className="text-sm text-muted-foreground">
                                    {nc.description}
                                  </p>
                                </div>

                                {nc.corrective_action && (
                                  <div>
                                    <p className="font-medium">Ação Corretiva</p>
                                    <p className="text-sm text-muted-foreground">
                                      {nc.corrective_action}
                                    </p>
                                  </div>
                                )}

                                {nc.deadline && (
                                  <div>
                                    <p className="font-medium">Prazo</p>
                                    <p className="text-sm text-muted-foreground">
                                      {formatDateSafely(nc.deadline)}
                                    </p>
                                  </div>
                                )}

                                {nc.media && nc.media.length > 0 && (
                                  <div>
                                    <p className="font-medium mb-2">Mídia Anexada</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                      {nc.media.map((media, mediaIndex) => (
                                        <div key={mediaIndex} className="border rounded p-2">
                                          <div className="flex items-center gap-2">
                                            {media.type === 'image' ? (
                                              <ImageIcon className="h-4 w-4 text-blue-500" />
                                            ) : (
                                              <Video className="h-4 w-4 text-green-500" />
                                            )}
                                            <span className="text-sm">{media.type}</span>
                                          </div>
                                          {media.cloudUrl && (
                                            <a href={media.cloudUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-xs hover:underline">
                                              Ver arquivo
                                            </a>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                                  <span>Criado: {formatDateSafely(nc.created_at)}</span>
                                  <span>Atualizado: {formatDateSafely(nc.updated_at)}</span>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )
                      )
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            )}

            <TabsContent value="template" className="mt-0 h-full">
              <ScrollArea className="h-full px-6 py-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{templateDetails?.title}</CardTitle>
                    <CardDescription>{templateDetails?.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {templateDetails?.topics && templateDetails.topics.length > 0 ? (
                      <div className="space-y-4">
                        {templateDetails.topics.map((topic, index) => (
                          <div key={index} className="border p-4 rounded-md">
                            <h3 className="font-medium text-lg mb-2">{topic.name}</h3>
                            {topic.description && (
                              <p className="text-sm text-muted-foreground mb-3">
                                {topic.description}
                              </p>
                            )}

                            {topic.items && topic.items.length > 0 ? (
                              <div className="space-y-3">
                                <h4 className="font-medium">Itens</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {topic.items.map((item, itemIndex) => (
                                    <div key={itemIndex} className="border p-3 rounded-md">
                                      <p className="font-medium">{item.name}</p>
                                      {item.description && (
                                        <p className="text-sm text-muted-foreground">
                                          {item.description}
                                        </p>
                                      )}

                                      {item.details && item.details.length > 0 && (
                                        <div className="mt-2">
                                          <h5 className="text-sm font-medium">Detalhes</h5>
                                          <ul className="text-xs mt-1 space-y-1">
                                            {item.details.map((detail, detailIndex) => (
                                              <li key={detailIndex}>
                                                {detail.name}
                                                {detail.required && (
                                                  <span className="text-red-500">*</span>
                                                )}
                                                {detail.type && (
                                                  <span className="text-muted-foreground ml-1">
                                                    ({detail.type})
                                                  </span>
                                                )}
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
                              <p className="text-sm text-muted-foreground">
                                Nenhum item definido.
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        Nenhum tópico definido neste template.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-between p-6 border-t sticky bottom-0 bg-background">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleEdit}
              className="flex items-center gap-2"
            >
              <Pencil className="h-4 w-4" />
              Editar Inspeção
            </Button>
            
          </div>
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}