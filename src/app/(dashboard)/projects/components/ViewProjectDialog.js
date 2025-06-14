// components/projects/components/ViewProjectDialog.js
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore" // Added orderBy
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter, // Added for close button
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format, parseISO, isValid } from "date-fns" // Added parseISO, isValid
import { ptBR } from "date-fns/locale"
import {
  Card,
  CardContent,
  CardDescription, // Keep if used, otherwise remove
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area" // For inspections list
import { Skeleton } from "@/components/ui/skeleton" // For loading states
import {
  CalendarDaysIcon, // Changed from CalendarIcon for more specificity
  FileTextIcon,     // Changed from FileIcon
  UsersIcon,        // Changed from UserIcon for client/responsible
  TagIcon,
  DollarSignIcon,
  ClockIcon,
  MailIcon,         // New
  PhoneIcon,        // New
  ClipboardListIcon, // New for inspections title
  BriefcaseIcon,    // New for project type
  InfoIcon,         // For "Sem descrição" etc.
  ExternalLinkIcon  // For navigation indication
} from "lucide-react"

// Status mapping similar to KanbanView
const projectStatusConfig = {
  "Aguardando": { text: "Aguardando", badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700", iconColor: "text-yellow-600" },
  "Em Andamento": { text: "Em Andamento", badgeClass: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700", iconColor: "text-blue-600" },
  "Em Revisão": { text: "Em Revisão", badgeClass: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700", iconColor: "text-purple-600" },
  "Concluído": { text: "Concluído", badgeClass: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700", iconColor: "text-green-600" }
};

const defaultStatusConfig = { text: "Desconhecido", badgeClass: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500", iconColor: "text-gray-500" };


// Helper for safe date formatting
const formatDateSafe = (dateInput, dateFormat = "PPP") => {
  if (!dateInput) return "N/A";
  try {
    const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    if (isValid(date)) {
      return format(date, dateFormat, { locale: ptBR });
    }
    return "Data inválida";
  } catch (error) {
    return "Erro na data";
  }
};

// Helper for status badge in inspections list
const getInspectionStatusBadgeVariant = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending': return 'warning';
    case 'in_progress': return 'info';
    case 'completed': return 'success';
    case 'canceled': return 'destructive';
    default: return 'secondary';
  }
};
const getInspectionStatusText = (status) => {
  const map = {
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    completed: 'Concluída',
    canceled: 'Cancelada',
  };
  return map[status?.toLowerCase()] || status || 'Desconhecido';
};


export default function ViewProjectDialog({ project, open, onClose }) {
  const [clientDetails, setClientDetails] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [loadingClient, setLoadingClient] = useState(true);
  const [loadingInspections, setLoadingInspections] = useState(true);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [showNavigationDialog, setShowNavigationDialog] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (open && project) { // Fetch only when dialog is open and project exists
      setLoadingClient(true);
      setLoadingInspections(true);
      setClientDetails(null); // Reset on open
      setInspections([]);   // Reset on open

      if (project.client_id) {
        fetchClientDetails(project.client_id);
      } else {
        setLoadingClient(false);
      }
      if (project.id) {
        fetchInspections(project.id);
      } else {
        setLoadingInspections(false);
      }
    }
  }, [project, open]); // Depend on 'open' as well

  const fetchClientDetails = async (clientId) => {
    try {
      const clientRef = doc(db, 'clients', clientId);
      const clientDoc = await getDoc(clientRef);
      if (clientDoc.exists()) {
        setClientDetails({ id: clientDoc.id, ...clientDoc.data() });
      } else {
        setClientDetails(null); // Client not found
      }
    } catch (error) {
      console.error("Error fetching client details:", error);
      setClientDetails(null);
    } finally {
      setLoadingClient(false);
    }
  };

  const fetchInspections = async (projectId) => {
    try {
      const inspectionsQuery = query(
        collection(db, 'inspections'),
        where('project_id', '==', projectId),
        where('deleted_at', '==', null),
        orderBy('scheduled_date', 'desc') // Order by scheduled date
      );
      const inspectionsSnapshot = await getDocs(inspectionsQuery);
      const inspectionsList = inspectionsSnapshot.docs.map(doc => {
        const data = doc.data();
        const safeTimestampToISO = (timestamp) => {
          if (!timestamp) return null;
          if (typeof timestamp === 'string') return timestamp;
          if (timestamp && typeof timestamp.toDate === 'function') return timestamp.toDate().toISOString();
          if (timestamp instanceof Date) return timestamp.toISOString();
          if (timestamp && typeof timestamp.seconds === 'number') return new Date(timestamp.seconds * 1000).toISOString();
          return null;
        };
        return {
          id: doc.id,
          ...data,
          scheduled_date: safeTimestampToISO(data.scheduled_date),
          created_at: safeTimestampToISO(data.created_at),
          updated_at: safeTimestampToISO(data.updated_at)
        };
      });
      setInspections(inspectionsList);
    } catch (error) {
      console.error("Error fetching inspections:", error);
    } finally {
      setLoadingInspections(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const handleInspectionClick = (inspection) => {
    setSelectedInspection(inspection);
    setShowNavigationDialog(true);
  };

  const handleNavigateToInspection = () => {
    if (selectedInspection) {
      router.push(`/inspections?highlight=${selectedInspection.id}`);
    }
    setShowNavigationDialog(false);
    setSelectedInspection(null);
    onClose(); // Close the project dialog as well
  };

  const handleCancelNavigation = () => {
    setShowNavigationDialog(false);
    setSelectedInspection(null);
  };

  if (!project) return null; // Don't render if no project

  const currentStatusConfig = projectStatusConfig[project.status] || defaultStatusConfig;

  const DetailItem = ({ icon: Icon, label, value, isMissing = false }) => (
    <div className="flex items-start gap-3 py-2">
      <Icon className={`h-5 w-5 mt-0.5 ${isMissing ? 'text-orange-400' : 'text-muted-foreground'}`} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium ${isMissing ? 'text-orange-500 italic' : 'text-foreground'}`}>
          {value || (isMissing ? "Não informado" : "N/A")}
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center justify-between text-xl">
            <span className="truncate pr-4">{project.title}</span>
            <Badge className={`px-2.5 py-1 text-xs ${currentStatusConfig.badgeClass}`}>
              {currentStatusConfig.text}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(100vh-150px)]">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BriefcaseIcon className="h-5 w-5 text-primary" />
                    Detalhes do Projeto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <DetailItem icon={FileTextIcon} label="Descrição" value={project.description} isMissing={!project.description} />
                  <Separator />
                  <DetailItem icon={TagIcon} label="Tipo" value={project.type} isMissing={!project.type} />
                  <Separator />
                  <DetailItem icon={DollarSignIcon} label="Valor" value={formatCurrency(project.project_price)} />
                  <Separator />
                  <DetailItem icon={CalendarDaysIcon} label="Data da Inspeção (Projeto)" value={formatDateSafe(project.inspection_date)} isMissing={!project.inspection_date} />
                  <Separator />
                  <DetailItem icon={ClockIcon} label="Criado em" value={formatDateSafe(project.created_at)} />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UsersIcon className="h-5 w-5 text-primary" />
                    Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {loadingClient ? (
                    <>
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full mt-2" />
                      <Skeleton className="h-10 w-full mt-2" />
                    </>
                  ) : clientDetails ? (
                    <>
                      <DetailItem icon={UsersIcon} label="Nome do Cliente" value={clientDetails.name} />
                      <Separator />
                      {(clientDetails.responsible_name || clientDetails.responsible_surname) && (
                        <>
                        <DetailItem 
                            icon={UsersIcon} 
                            label="Responsável" 
                            value={`${clientDetails.responsible_name || ''} ${clientDetails.responsible_surname || ''}`.trim()} 
                        />
                        <Separator />
                        </>
                      )}
                      <DetailItem icon={PhoneIcon} label="Telefone" value={clientDetails.phonenumber} isMissing={!clientDetails.phonenumber} />
                      <Separator />
                      <DetailItem icon={MailIcon} label="Email" value={clientDetails.email} isMissing={!clientDetails.email} />
                    </>
                  ) : (
                    <DetailItem icon={InfoIcon} label="Cliente" value="Informações do cliente não encontradas." isMissing={true} />
                  )}
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardListIcon className="h-5 w-5 text-primary" />
                  Inspeções Vinculadas ({inspections.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingInspections ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : inspections.length > 0 ? (
                  <ScrollArea className="h-[200px] pr-3"> {/* Max height for scroll */}
                    <div className="space-y-3">
                      {inspections.map((inspection) => (
                        <div 
                          key={inspection.id} 
                          className="flex items-center justify-between p-3 border rounded-md bg-background hover:bg-accent cursor-pointer transition-colors group"
                          onClick={() => handleInspectionClick(inspection)}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm text-foreground group-hover:text-primary flex items-center gap-2">
                              {inspection.title || "Inspeção Sem Título"}
                              <ExternalLinkIcon className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Agendada para: {formatDateSafe(inspection.scheduled_date, "dd/MM/yy HH:mm")}
                            </p>
                          </div>
                          <Badge variant={getInspectionStatusBadgeVariant(inspection.status)} className="text-xs px-2 py-0.5">
                            {getInspectionStatusText(inspection.status)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma inspeção encontrada para este projeto.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
        
        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
      
      {/* Navigation Confirmation Dialog */}
      <Dialog open={showNavigationDialog} onOpenChange={setShowNavigationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Navegar para Inspeções</DialogTitle>
            <DialogDescription>
              Deseja ir para a tela de inspeções e visualizar a inspeção "{selectedInspection?.title || 'Inspeção Sem Título'}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelNavigation}>
              Cancelar
            </Button>
            <Button onClick={handleNavigateToInspection}>
              Ir para Inspeções
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}