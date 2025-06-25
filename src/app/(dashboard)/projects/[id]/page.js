// src/app/(dashboard)/projects/[id]/page.js
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useNavigation } from "@/hooks/use-navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import GrantAccessDialog from "../components/GrantAccessDialog";
import {
  ArrowLeft, Edit, Save, X, CalendarDaysIcon, FileTextIcon, UsersIcon, TagIcon, DollarSignIcon,
  ClockIcon, MailIcon, PhoneIcon, ClipboardListIcon, BriefcaseIcon, InfoIcon, ExternalLinkIcon, Shield,
  Settings, Trash2, AlertTriangle
} from "lucide-react";

const projectStatusConfig = {
  "Aguardando": { text: "Aguardando", badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700" },
  "Em Andamento": { text: "Em Andamento", badgeClass: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700" },
  "Em Revisão": { text: "Em Revisão", badgeClass: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700" },
  "Concluído": { text: "Concluído", badgeClass: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700" }
};

const defaultStatusConfig = { text: "Desconhecido", badgeClass: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500" };

const statusOptions = ["Aguardando", "Em Andamento", "Em Revisão", "Concluído"];

const projectTypeOptions = [
  "Inspeção de Redes",
  "Inspeção de Obras",
  "Levantamento Arquitetônico",
  "Implantação",
  "Outro"
];

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

// Progress calculation function from reports
const calculateCompletion = (inspection) => {
  if (!inspection.topics || inspection.topics.length === 0) return 0;

  let totalFields = 0;
  let filledFields = 0;

  inspection.topics.forEach(topic => {
    if (topic.items) {
      topic.items.forEach(item => {
        if (item.details) {
          item.details.forEach(detail => {
            totalFields++;
            if (detail.value !== null && detail.value !== undefined && detail.value !== "") {
              filledFields++;
            }
          });
        }
      });
    }
  });

  return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
};

export default function ProjectViewPage() {
  const params = useParams();
  const { navigateTo, goBack } = useNavigation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [project, setProject] = useState(null);
  const [clientDetails, setClientDetails] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [clients, setClients] = useState([]);
  const [subManagersWithAccess, setSubManagersWithAccess] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingClient, setLoadingClient] = useState(true);
  const [loadingInspections, setLoadingInspections] = useState(true);
  const [loadingSubManagers, setLoadingSubManagers] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [removingAccess, setRemovingAccess] = useState(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showGrantAccessDialog, setShowGrantAccessDialog] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "",
    project_price: "0",
    client_id: "",
    status: "Aguardando",
  });

  useEffect(() => {
    if (user && params.id) {
      fetchProjectData();
    }
  }, [user, params.id]);

  const fetchProjectData = async () => {
    setLoading(true);
    try {
      // Fetch project
      const projectRef = doc(db, 'projects', params.id);
      const projectDoc = await getDoc(projectRef);
      
      if (!projectDoc.exists()) {
        toast({
          title: "Projeto não encontrado",
          variant: "destructive"
        });
        navigateTo('/projects');
        return;
      }

      const projectData = {
        id: projectDoc.id,
        ...projectDoc.data(),
        created_at: projectDoc.data().created_at?.toDate?.()?.toISOString() || projectDoc.data().created_at,
        updated_at: projectDoc.data().updated_at?.toDate?.()?.toISOString() || projectDoc.data().updated_at,
        inspection_date: projectDoc.data().inspection_date?.toDate?.()?.toISOString() || projectDoc.data().inspection_date
      };

      setProject(projectData);
      
      // Set form data
      setFormData({
        title: projectData.title || "",
        description: projectData.description || "",
        type: projectData.type || "",
        project_price: projectData.project_price?.toString() || "0",
        client_id: projectData.client_id || "",
        status: projectData.status || "Aguardando",
      });

      // Fetch client details
      if (projectData.client_id) {
        fetchClientDetails(projectData.client_id);
      } else {
        setLoadingClient(false);
      }

      // Fetch inspections
      fetchInspections(projectData.id);

      // Fetch all clients for editing
      fetchClients();

      // Fetch sub-managers with access if project has shared_with array
      if (projectData.shared_with && projectData.shared_with.length > 0) {
        fetchSubManagersWithAccess(projectData.shared_with);
      }

    } catch (error) {
      console.error("Error fetching project:", error);
      toast({
        title: "Erro ao carregar projeto",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClientDetails = async (clientId) => {
    try {
      const clientRef = doc(db, 'clients', clientId);
      const clientDoc = await getDoc(clientRef);
      if (clientDoc.exists()) {
        setClientDetails({ id: clientDoc.id, ...clientDoc.data() });
      } else {
        setClientDetails(null);
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
        orderBy('scheduled_date', 'desc')
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

  const fetchClients = async () => {
    try {
      const clientsQuery = query(
        collection(db, 'clients'),
        where('deleted_at', '==', null)
      );
      const clientsSnapshot = await getDocs(clientsQuery);
      const clientsList = clientsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => a.name.localeCompare(b.name));
      setClients(clientsList);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchSubManagersWithAccess = async (userIds) => {
    if (!userIds || userIds.length === 0) {
      setSubManagersWithAccess([]);
      return;
    }

    setLoadingSubManagers(true);
    try {
      const subManagersList = [];
      
      // For each user ID, fetch user data and manager data
      for (const userId of userIds) {
        try {
          // Fetch user data
          const userRef = doc(db, 'users', userId);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists() && userDoc.data().role === 'sub_manager') {
            const userData = userDoc.data();
            
            // Fetch manager data
            const managersQuery = query(
              collection(db, 'managers'),
              where('user_id', '==', userId)
            );
            const managersSnapshot = await getDocs(managersQuery);
            
            if (!managersSnapshot.empty) {
              const managerData = managersSnapshot.docs[0].data();
              
              subManagersList.push({
                id: userId,
                email: userData.email,
                ...managerData,
                managerId: managersSnapshot.docs[0].id
              });
            }
          }
        } catch (err) {
          console.error(`Error fetching data for user ${userId}:`, err);
        }
      }
      
      setSubManagersWithAccess(subManagersList);
    } catch (error) {
      console.error("Error fetching sub-managers with access:", error);
    } finally {
      setLoadingSubManagers(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const projectPrice = parseFloat(formData.project_price) || 0;
      const projectRef = doc(db, 'projects', params.id);
      
      await updateDoc(projectRef, {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        project_price: projectPrice,
        client_id: formData.client_id,
        status: formData.status,
        updated_at: serverTimestamp()
      });

      // Update local state
      const updatedProject = {
        ...project,
        title: formData.title,
        description: formData.description,
        type: formData.type,
        project_price: projectPrice,
        client_id: formData.client_id,
        status: formData.status,
      };
      setProject(updatedProject);

      // Refresh client details if client changed
      if (formData.client_id !== project.client_id) {
        setLoadingClient(true);
        if (formData.client_id) {
          fetchClientDetails(formData.client_id);
        } else {
          setClientDetails(null);
          setLoadingClient(false);
        }
      }

      setIsEditing(false);
      toast({
        title: "Projeto atualizado com sucesso"
      });
    } catch (error) {
      console.error("Error updating project:", error);
      toast({
        title: "Erro ao atualizar projeto",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (project) {
      setFormData({
        title: project.title || "",
        description: project.description || "",
        type: project.type || "",
        project_price: project.project_price?.toString() || "0",
        client_id: project.client_id || "",
        status: project.status || "Aguardando",
      });
    }
    setIsEditing(false);
  };

  const handleInspectionClick = (inspection) => {
    navigateTo(`/inspections/${inspection.id}/editor`);
  };

  const handleRemoveAccess = async (subManagerId) => {
    try {
      const updatedSharedWith = project.shared_with.filter(id => id !== subManagerId);
      const projectRef = doc(db, 'projects', params.id);
      
      await updateDoc(projectRef, {
        shared_with: updatedSharedWith,
        access_updated_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      // Update local state
      setProject(prev => ({
        ...prev,
        shared_with: updatedSharedWith
      }));

      // Update sub-managers list
      setSubManagersWithAccess(prev => 
        prev.filter(sm => sm.id !== subManagerId)
      );

      const removedSubManager = subManagersWithAccess.find(sm => sm.id === subManagerId);
      
      toast({
        title: "Acesso removido com sucesso",
        description: `${removedSubManager?.name} ${removedSubManager?.last_name} não tem mais acesso ao projeto`
      });

      setShowRemoveDialog(false);
      setRemovingAccess(null);
    } catch (error) {
      console.error("Error removing access:", error);
      toast({
        title: "Erro ao remover acesso",
        description: "Não foi possível remover o acesso do subgerente",
        variant: "destructive"
      });
    }
  };

  const openManageAccess = () => {
    setShowGrantAccessDialog(true);
  };

  const handleAccessGranted = () => {
    // Refresh project data to get updated shared_with array
    fetchProjectData();
  };


  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <p className="text-lg font-medium">Projeto não encontrado</p>
        <EnhancedButton onClick={() => navigateTo('/projects')}>
          Voltar para Projetos
        </EnhancedButton>
      </div>
    );
  }

  const currentStatusConfig = projectStatusConfig[project.status] || defaultStatusConfig;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <EnhancedButton 
            variant="ghost" 
            size="sm" 
            onClick={() => navigateTo('/projects')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </EnhancedButton>
          <div>
            <h1 className="text-2xl font-bold">{project.title}</h1>
            <Badge className={`px-2.5 py-1 text-xs ${currentStatusConfig.badgeClass}`}>
              {currentStatusConfig.text}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <EnhancedButton 
                variant="outline" 
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </EnhancedButton>
              <EnhancedButton 
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Salvando..." : "Salvar"}
              </EnhancedButton>
            </>
          ) : (
            <EnhancedButton onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </EnhancedButton>
          )}
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="inspections">Inspeções ({inspections.length})</TabsTrigger>
          <TabsTrigger value="access">Acesso ({project?.shared_with?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BriefcaseIcon className="h-5 w-5 text-primary" />
                  Detalhes do Projeto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Título</label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Título do projeto"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Descrição</label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Descrição do projeto"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Tipo</label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {projectTypeOptions.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Valor</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.project_price}
                        onChange={(e) => setFormData({ ...formData, project_price: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Cliente</label>
                      <Select
                        value={formData.client_id}
                        onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <DetailItem icon={FileTextIcon} label="Descrição" value={project.description} isMissing={!project.description} />
                    <Separator />
                    <DetailItem icon={TagIcon} label="Tipo" value={project.type} isMissing={!project.type} />
                    <Separator />
                    <DetailItem icon={DollarSignIcon} label="Valor" value={formatCurrency(project.project_price)} />
                    <Separator />
                    <DetailItem icon={CalendarDaysIcon} label="Data da Inspeção" value={formatDateSafe(project.inspection_date)} isMissing={!project.inspection_date} />
                    <Separator />
                    <DetailItem icon={ClockIcon} label="Criado em" value={formatDateSafe(project.created_at)} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client Details */}
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
        </TabsContent>

        <TabsContent value="inspections" className="space-y-6">
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
                <div className="space-y-3">
                  {inspections.map((inspection) => {
                    const progress = calculateCompletion(inspection);
                    return (
                      <div 
                        key={inspection.id} 
                        className="flex items-center justify-between p-4 border rounded-md bg-background hover:bg-accent cursor-pointer transition-colors group"
                        onClick={() => handleInspectionClick(inspection)}
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm text-foreground group-hover:text-primary flex items-center gap-2">
                              {inspection.title || "Inspeção Sem Título"}
                              <ExternalLinkIcon className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                            <Badge variant={getInspectionStatusBadgeVariant(inspection.status)} className="text-xs px-2 py-0.5">
                              {getInspectionStatusText(inspection.status)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Agendada para: {formatDateSafe(inspection.scheduled_date, "dd/MM/yy HH:mm")}
                          </p>
                          {progress > 0 && (
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Progresso</span>
                                <span className="text-xs font-medium">{progress}%</span>
                              </div>
                              <Progress value={progress} className="h-1.5" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma inspeção encontrada para este projeto.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Subgerentes com Acesso ({project?.shared_with?.length || 0})
                  </CardTitle>
                  <CardDescription>
                    Lista de subgerentes que têm acesso a este projeto
                  </CardDescription>
                </div>
                <EnhancedButton
                  size="sm"
                  onClick={openManageAccess}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Gerenciar Acesso
                </EnhancedButton>
              </div>
            </CardHeader>
            <CardContent>
              {loadingSubManagers ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : !project?.shared_with || project.shared_with.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Nenhum subgerente tem acesso a este projeto
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Use o botão "Gerenciar Acesso" nas ações do projeto para conceder acesso
                  </p>
                </div>
              ) : subManagersWithAccess.length > 0 ? (
                <div className="space-y-3">
                  {subManagersWithAccess.map((subManager) => (
                    <div 
                      key={subManager.id}
                      className="flex items-center gap-4 p-4 border rounded-lg bg-background hover:bg-accent/50 transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={subManager.profileImageUrl} />
                        <AvatarFallback className="text-sm">
                          {subManager.name?.charAt(0)?.toUpperCase()}{subManager.last_name?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">
                            {subManager.name} {subManager.last_name}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            Subgerente
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {subManager.email}
                        </p>
                        {subManager.profession && (
                          <p className="text-xs text-muted-foreground">
                            {subManager.profession}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {subManager.permissions?.length || 0} permissões
                          </p>
                          {subManager.permissions?.includes('view_projects') && (
                            <div className="flex items-center gap-1 mt-1">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span className="text-xs text-green-700">Pode visualizar</span>
                            </div>
                          )}
                        </div>
                        <EnhancedButton
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRemovingAccess(subManager);
                            setShowRemoveDialog(true);
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Remover acesso"
                        >
                          <Trash2 className="h-4 w-4" />
                        </EnhancedButton>
                      </div>
                    </div>
                  ))}
                  
                  {project.access_updated_at && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-muted-foreground">
                        Última atualização de acesso: {formatDateSafe(project.access_updated_at, "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto text-orange-400 mb-4" />
                  <p className="text-sm text-orange-600 mb-2">
                    Erro ao carregar informações dos subgerentes
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Os subgerentes podem ter sido removidos do sistema
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Grant Access Dialog */}
      {showGrantAccessDialog && (
        <GrantAccessDialog
          project={project}
          open={showGrantAccessDialog}
          onClose={() => setShowGrantAccessDialog(false)}
          onAccessGranted={handleAccessGranted}
        />
      )}

      {/* Remove Access Confirmation Dialog */}
      {showRemoveDialog && removingAccess && (
        <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Remover Acesso
              </DialogTitle>
              <DialogDescription>
                Tem certeza que deseja remover o acesso de <strong>{removingAccess.name} {removingAccess.last_name}</strong> a este projeto?
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={removingAccess.profileImageUrl} />
                  <AvatarFallback className="text-xs">
                    {removingAccess.name?.charAt(0)?.toUpperCase()}{removingAccess.last_name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm text-red-900">
                    {removingAccess.name} {removingAccess.last_name}
                  </p>
                  <p className="text-xs text-red-700">{removingAccess.email}</p>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mt-3">
                Esta ação não pode ser desfeita. O subgerente perderá acesso imediatamente e precisará ser adicionado novamente se necessário.
              </p>
            </div>

            <DialogFooter className="flex gap-2">
              <EnhancedButton 
                variant="outline" 
                onClick={() => {
                  setShowRemoveDialog(false);
                  setRemovingAccess(null);
                }}
              >
                Cancelar
              </EnhancedButton>
              <EnhancedButton 
                variant="destructive"
                onClick={() => handleRemoveAccess(removingAccess.id)}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Remover Acesso
              </EnhancedButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}