// src/app/(dashboard)/dashboard/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { ResponsiveContainer as ResponsiveWrapper, ResponsiveGrid } from "@/components/ui/responsive-container";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, LineChart, PieChart } from "recharts";
import { Bar, Line, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import MapView from "@/components/MapView";
import { getInternalStatus, getInternalStatusText, getInternalStatusHexColor } from "@/utils/inspection-status";
import { 
  Building, Calendar, Users, DollarSign, File, Flag, FileText,
  Home, Layers, User, CheckSquare, AlertCircle, ArrowUp, ArrowDown,
  ClipboardList, BarChart2, ExternalLink, Map
} from "lucide-react";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalInspections: 0,
    completedInspections: 0,
    pendingInspections: 0,
    totalClients: 0,
    totalInspectors: 0,
    totalTemplates: 0,
    activeInspections: 0
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [projectsData, setProjectsData] = useState([]);
  const [inspectionsByStatus, setInspectionsByStatus] = useState([]);
  const [monthlyInspections, setMonthlyInspections] = useState([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (!user?.uid) return;

      // Fetch projects
      // TODO: Restringir por manager_id quando necessário
      // const projectsQuery = query(
      //   collection(db, 'projects'),
      //   where('manager_id', '==', user.uid),
      //   where('deleted_at', '==', null),
      //   orderBy('created_at', 'desc')
      // );
      const projectsQuery = query(
        collection(db, 'projects'),
        where('deleted_at', '==', null),
        orderBy('created_at', 'desc')
      );
      
      const projectsSnapshot = await getDocs(projectsQuery);
      const projectsList = projectsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at && typeof data.created_at.toDate === 'function' 
            ? data.created_at.toDate().toISOString() 
            : data.created_at
        };
      });
      
      // Get project IDs for inspection queries
      const projectIds = projectsList.map(project => project.id);
      
      // Fetch inspections
      let inspectionsList = [];
      
      if (projectIds.length > 0) {
        // Firebase IN queries are limited to 10 values, so we need to split our queries
        const projectIdBatches = [];
        for (let i = 0; i < projectIds.length; i += 10) {
          projectIdBatches.push(projectIds.slice(i, i + 10));
        }
        
        for (const batch of projectIdBatches) {
          const inspectionsQuery = query(
            collection(db, 'inspections'),
            where('project_id', 'in', batch),
            where('deleted_at', '==', null)
          );
          
          const batchSnapshot = await getDocs(inspectionsQuery);
          const batchList = batchSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              created_at: data.created_at && typeof data.created_at.toDate === 'function'
                ? data.created_at.toDate().toISOString()
                : data.created_at,
              scheduled_date: data.scheduled_date && typeof data.scheduled_date.toDate === 'function'
                ? data.scheduled_date.toDate().toISOString()
                : data.scheduled_date
            };
          });
          
          inspectionsList = [...inspectionsList, ...batchList];
        }
      }
      
      // Fetch clients
      // TODO: Restringir por manager_id quando necessário
      // const clientsQuery = query(
      //   collection(db, 'clients'),
      //   where('deleted_at', '==', null),
      //   where('manager_id', '==', user.uid)
      // );
      const clientsQuery = query(
        collection(db, 'clients'),
        where('deleted_at', '==', null)
      );
      
      const clientsSnapshot = await getDocs(clientsQuery);

      // Fetch Inspectors
      // TODO: Restringir por manager_id quando necessário
      // const inspectorsQuery = query(
      //   collection(db, 'inspectors'),
      //   where('deleted_at', '==', null),
      //   where('manager_id', '==', user.uid)
      // );
      const inspectorsQuery = query(
        collection(db, 'inspectors'),
        where('deleted_at', '==', null)
      );

      // Fetch templates
      const templatesQuery = query(
        collection(db, 'templates'),
        where('deleted_at', '==', null)
      );
      
      const templatesSnapshot = await getDocs(templatesQuery);
      const inspectorsSnapshot = await getDocs(inspectorsQuery);

      // Calculate stats using internal status
      const pendingInspections = inspectionsList.filter(i => getInternalStatus(i) === 'pendente').length;
      const editedInspections = inspectionsList.filter(i => getInternalStatus(i) === 'editada').length;
      const deliveredInspections = inspectionsList.filter(i => getInternalStatus(i) === 'entregue').length;
      
      // Set statistics
      setStats({
        totalProjects: projectsList.length,
        totalInspections: inspectionsList.length,
        completedInspections: deliveredInspections, // Renomeado para manter compatibilidade
        pendingInspections,
        editedInspections,
        deliveredInspections,
        totalClients: clientsSnapshot.size,
        totalTemplates: templatesSnapshot.size,
        totalInspectors: inspectorsSnapshot.size,
        activeInspections: pendingInspections + editedInspections
      });
      
      // Set recent projects
      setRecentProjects(projectsList.slice(0, 5));
      
      // Prepare data for charts
      
      // Project type distribution
      const projectTypes = {};
      projectsList.forEach(project => {
        const type = project.type || 'Não especificado';
        projectTypes[type] = (projectTypes[type] || 0) + 1;
      });
      
      const projectsChartData = Object.keys(projectTypes).map(type => ({
        name: type,
        value: projectTypes[type]
      }));
      
      setProjectsData(projectsChartData);
      
      // Inspections by status
      setInspectionsByStatus([
        { name: 'Pendente', value: pendingInspections, color: getInternalStatusHexColor('pendente') },
        { name: 'Editada', value: editedInspections, color: getInternalStatusHexColor('editada') },
        { name: 'Entregue', value: deliveredInspections, color: getInternalStatusHexColor('entregue') }
      ]);
      
      // Monthly inspections
      const last6Months = [];
      const today = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
        last6Months.push({
          name: format(month, 'MMM', { locale: ptBR }),
          month: month.getMonth(),
          year: month.getFullYear()
        });
      }
      
      const monthlyData = last6Months.map(monthObj => {
        const count = inspectionsList.filter(inspection => {
          if (!inspection.created_at) return false;
          const inspectionDate = new Date(inspection.created_at);
          return inspectionDate.getMonth() === monthObj.month && 
                 inspectionDate.getFullYear() === monthObj.year;
        }).length;
        
        return {
          name: monthObj.name,
          inspections: count
        };
      });
      
      setMonthlyInspections(monthlyData);
      
    } catch (error) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = (project) => {
    router.push(`/projects/${project.id}`);
  };

  const monthlyInspectionConfig = {
    inspections: {
      label: "Inspeções",
      color: "hsl(var(--chart-2))"
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      
      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Projetos ativos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inspeções</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInspections}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.deliveredInspections} entregues, {stats.editedInspections} editadas, {stats.pendingInspections} pendentes
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Clientes ativos
            </p>
          </CardContent>
        </Card>
        
      </div>
      
      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Mapa
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {/* Projects Status */}
            <Card className="col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Tipos de Projetos</CardTitle>
                <CardDescription>Distribuição por tipo de projeto</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {projectsData.length > 0 ? (
                  <ChartContainer className="h-[240px]">
                  <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={projectsData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {projectsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[240px] text-muted-foreground">
                    Nenhum projeto encontrado
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Inspection Status */}
            <Card className="col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Status das Inspeções</CardTitle>
                <CardDescription>Distribuição por status</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {inspectionsByStatus.some(item => item.value > 0) ? (
                  <ChartContainer className="h-[240px]">
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={inspectionsByStatus.filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {inspectionsByStatus.filter(item => item.value > 0).map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[240px] text-muted-foreground">
                    Nenhuma inspeção encontrada
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Monthly Trend */}
            <Card className="col-span-1 md:col-span-2 lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Inspeções Mensais</CardTitle>
                <CardDescription>Últimos 6 meses</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {monthlyInspections.some(item => item.inspections > 0) ? (
                  <ChartContainer config={monthlyInspectionConfig} className="h-[240px]">
                    <BarChart data={monthlyInspections} accessibilityLayer>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="inspections" fill="var(--color-inspections)" radius={4} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[240px] text-muted-foreground">
                    Nenhuma inspeção nos últimos 6 meses
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Projects */}
          <Card>
            <CardHeader>
              <CardTitle>Projetos Recentes</CardTitle>
              <CardDescription>Projetos adicionados recentemente</CardDescription>
            </CardHeader>
            <CardContent>
              {recentProjects.length > 0 ? (
                <div className="space-y-4">
                  {recentProjects.map((project) => (
                    <div 
                      key={project.id} 
                      className="flex justify-between items-center p-3 border rounded-md hover:bg-accent cursor-pointer transition-colors group"
                      onClick={() => handleProjectClick(project)}
                    >
                      <div className="flex-1">
                        <div className="font-medium group-hover:text-primary flex items-center gap-2">
                          {project.title}
                          <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {project.type || "Não categorizado"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {project.status || "Status não definido"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {project.created_at ? format(new Date(project.created_at), 'dd/MM/yyyy') : 'N/A'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  Nenhum projeto encontrado.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Resumo das Inspeções</CardTitle>
                <CardDescription>Distribuição por status de inspeção</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-md p-3">
                      <div className="text-sm text-muted-foreground">Pendentes</div>
                      <div className="text-2xl font-bold text-amber-500">{stats.pendingInspections}</div>
                    </div>
                    <div className="border rounded-md p-3">
                      <div className="text-sm text-muted-foreground">Editadas</div>
                      <div className="text-2xl font-bold text-blue-500">{stats.editedInspections}</div>
                    </div>
                    <div className="border rounded-md p-3">
                      <div className="text-sm text-muted-foreground">Entregues</div>
                      <div className="text-2xl font-bold text-green-500">{stats.deliveredInspections}</div>
                    </div>
                    <div className="border rounded-md p-3">
                      <div className="text-sm text-muted-foreground">Taxa de Entrega</div>
                      <div className="text-2xl font-bold">
                        {stats.totalInspections > 0 
                          ? `${(stats.deliveredInspections / stats.totalInspections * 100).toFixed(1)}%` 
                          : '0%'}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Lincers</CardTitle>
                <CardDescription>Estatísticas de linceres ativos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Lincers Ativos</div>
                      <div className="text-2xl font-bold">
                        {stats.totalInspectors}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Inspeções por Lincer</div>
                      <div className="text-2xl font-bold">
                        {stats.totalInspectors > 0 
                          ? (stats.totalInspections / stats.totalInspectors).toFixed(1)
                          : '0'}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Análise de Performance</AlertTitle>
            <AlertDescription>
              {stats.deliveredInspections > stats.pendingInspections 
                ? "Bom trabalho! A maioria das inspeções foram entregues."
                : "Atenção: Existem mais inspeções pendentes do que entregues."}
            </AlertDescription>
          </Alert>
        </TabsContent>
        
        <TabsContent value="map" className="space-y-6">
          <Card className="min-h-[600px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                Mapa de Lincers e Inspeções
              </CardTitle>
              <CardDescription>
                Visualização geográfica dos linceres cadastrados e inspeções em andamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MapView />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}