// src/app/(dashboard)/dashboard/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, LineChart, PieChart } from "recharts";
import { Bar, Line, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Building, Calendar, Users, DollarSign, File, Flag, FileText,
  Home, Layers, User, CheckSquare, AlertCircle, ArrowUp, ArrowDown,
  ClipboardList, BarChart2, ExternalLink 
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
  const [selectedProject, setSelectedProject] = useState(null);
  const [showNavigationDialog, setShowNavigationDialog] = useState(false);
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
      const projectsQuery = query(
        collection(db, 'projects'),
        where('manager_id', '==', user.uid),
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
      const clientsQuery = query(
        collection(db, 'clients'),
        where('deleted_at', '==', null),
        where('manager_id', '==', user.uid)
      );
      
      const clientsSnapshot = await getDocs(clientsQuery);

      // Fetch Inspectors
      const inspectorsQuery = query(
        collection(db, 'inspectors'),
        where('deleted_at', '==', null),
        where('manager_id', '==', user.uid)
      );

      // Fetch templates
      const templatesQuery = query(
        collection(db, 'templates'),
        where('deleted_at', '==', null)
      );
      
      const templatesSnapshot = await getDocs(templatesQuery);
      const inspectorsSnapshot = await getDocs(inspectorsQuery);

      // Calculate stats
      const completedInspections = inspectionsList.filter(i => i.status === 'completed').length;
      const pendingInspections = inspectionsList.filter(i => i.status === 'pending').length;
      const inProgressInspections = inspectionsList.filter(i => i.status === 'in_progress').length;
      const canceledInspections = inspectionsList.filter(i => i.status === 'canceled').length;
      
      // Set statistics
      setStats({
        totalProjects: projectsList.length,
        totalInspections: inspectionsList.length,
        completedInspections,
        pendingInspections,
        totalClients: clientsSnapshot.size,
        totalTemplates: templatesSnapshot.size,
        totalInspectors: inspectorsSnapshot.size,
        activeInspections: pendingInspections + inProgressInspections
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
        { name: 'Pendente', value: pendingInspections, color: '#facc15' },
        { name: 'Em Andamento', value: inProgressInspections, color: '#3b82f6' },
        { name: 'Concluída', value: completedInspections, color: '#22c55e' },
        { name: 'Cancelada', value: canceledInspections, color: '#ef4444' }
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
      console.error("Error fetching dashboard data:", error);
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
    setSelectedProject(project);
    setShowNavigationDialog(true);
  };

  const handleNavigateToProject = () => {
    if (selectedProject) {
      router.push(`/projects?highlight=${selectedProject.id}`);
    }
    setShowNavigationDialog(false);
    setSelectedProject(null);
  };

  const handleCancelNavigation = () => {
    setShowNavigationDialog(false);
    setSelectedProject(null);
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
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
              {stats.completedInspections} concluídas, {stats.pendingInspections} pendentes
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
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalTemplates}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Modelos ativos
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
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
                      <div className="text-sm text-muted-foreground">Em Andamento</div>
                      <div className="text-2xl font-bold text-blue-500">{stats.activeInspections - stats.pendingInspections}</div>
                    </div>
                    <div className="border rounded-md p-3">
                      <div className="text-sm text-muted-foreground">Concluídas</div>
                      <div className="text-2xl font-bold text-green-500">{stats.completedInspections}</div>
                    </div>
                    <div className="border rounded-md p-3">
                      <div className="text-sm text-muted-foreground">Taxa de Conclusão</div>
                      <div className="text-2xl font-bold">
                        {stats.totalInspections > 0 
                          ? `${(stats.completedInspections / stats.totalInspections * 100).toFixed(1)}%` 
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
                <CardDescription>Estatísticas de lincers ativos</CardDescription>
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
                      <div className="text-sm text-muted-foreground">Inspeções por Lincers</div>
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
              {stats.completedInspections > stats.pendingInspections 
                ? "Bom trabalho! A maioria das inspeções foram concluídas."
                : "Atenção: Existem mais inspeções pendentes do que concluídas."}
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      {/* Navigation Confirmation Dialog */}
      <Dialog open={showNavigationDialog} onOpenChange={setShowNavigationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Navegar para Projetos</DialogTitle>
            <DialogDescription>
              Deseja ir para a tela de projetos e visualizar o projeto "{selectedProject?.title}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelNavigation}>
              Cancelar
            </Button>
            <Button onClick={handleNavigateToProject}>
              Ir para Projetos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}