// src/app/(dashboard)/reports/page.js
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  FileText, 
  Filter, 
  Download, 
  Eye, 
  Search,
  Calendar,
  Building,
  User,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import ReportFilters from "./components/ReportFilters";
import InspectionReportCard from "./components/InspectionReportCard";
import ReportViewer from "./components/ReportViewer";

export default function ReportsPage() {
  const [inspections, setInspections] = useState([]);
  const [filteredInspections, setFilteredInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    completion: "all",
    project: "all",
    dateRange: null
  });
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchInspections();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [inspections, filters, searchTerm]);

  const fetchInspections = async () => {
    try {
      // Buscar projetos do gerente
      const projectsQuery = query(
        collection(db, 'projects'),
        where('manager_id', '==', user.uid),
        where('deleted_at', '==', null)
      );
      
      const projectsSnapshot = await getDocs(projectsQuery);
      const projectIds = projectsSnapshot.docs.map(doc => doc.id);
      
      if (projectIds.length === 0) {
        setInspections([]);
        setLoading(false);
        return;
      }

      // Buscar inspeções
      const inspectionsPromises = [];
      for (let i = 0; i < projectIds.length; i += 10) {
        const batch = projectIds.slice(i, i + 10);
        const inspectionsQuery = query(
          collection(db, 'inspections'),
          where('project_id', 'in', batch),
          where('deleted_at', '==', null),
          orderBy('created_at', 'desc')
        );
        inspectionsPromises.push(getDocs(inspectionsQuery));
      }

      const inspectionsSnapshots = await Promise.all(inspectionsPromises);
      const allInspections = [];

      for (const snapshot of inspectionsSnapshots) {
        for (const doc of snapshot.docs) {
          const data = doc.data();
          const inspection = {
            id: doc.id,
            ...data,
            completion: calculateCompletion(data),
            created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
            updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at
          };

          // Buscar dados do projeto
          const project = projectsSnapshot.docs.find(p => p.id === inspection.project_id);
          if (project) {
            inspection.project = { id: project.id, ...project.data() };
          }

          // Buscar releases
          const releasesQuery = query(
            collection(db, 'inspection_releases'),
            where('inspection_id', '==', doc.id),
            orderBy('created_at', 'desc')
          );
          const releasesSnapshot = await getDocs(releasesQuery);
          inspection.releases = releasesSnapshot.docs.map(releaseDoc => ({
            id: releaseDoc.id,
            ...releaseDoc.data(),
            created_at: releaseDoc.data().created_at?.toDate?.()?.toISOString()
          }));

          allInspections.push(inspection);
        }
      }

      setInspections(allInspections);
    } catch (error) {
      console.error("Error fetching inspections:", error);
      toast({
        title: "Erro ao carregar relatórios",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

    const handleGeneratePreview = async (inspection, release = null) => {
    try {
        const reportData = release ? release.inspection_snapshot : inspection;
        const releaseIndex = release ? inspection.releases.indexOf(release) : 0;
        
        toast({
        title: release 
            ? `Gerando PDF: RLT${(releaseIndex + 1).toString().padStart(2, '0')}-${inspection.cod}` 
            : "Gerando Preview do PDF",
        description: release?.release_notes || "Preparando relatório..."
        });

        await generateInspectionPDF(reportData, {
        isPreview: !release,
        releaseInfo: release,
        inspectionCode: inspection.cod,
        releaseIndex
        });

    } catch (error) {
        toast({
        title: "Erro ao gerar PDF",
        description: error.message,
        variant: "destructive"
        });
    }
    };

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

  const applyFilters = () => {
    let filtered = [...inspections];

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(inspection => 
        inspection.title?.toLowerCase().includes(term) ||
        inspection.cod?.toLowerCase().includes(term) ||
        inspection.project?.title?.toLowerCase().includes(term)
      );
    }

    // Filtro de status
    if (filters.status !== "all") {
      filtered = filtered.filter(inspection => inspection.status === filters.status);
    }

    // Filtro de completude
    if (filters.completion !== "all") {
      if (filters.completion === "complete") {
        filtered = filtered.filter(inspection => inspection.completion === 100);
      } else if (filters.completion === "incomplete") {
        filtered = filtered.filter(inspection => inspection.completion < 100);
      }
    }

    // Filtro de projeto
    if (filters.project !== "all") {
      filtered = filtered.filter(inspection => inspection.project_id === filters.project);
    }

    // Filtro de data
    if (filters.dateRange?.from && filters.dateRange?.to) {
      const fromDate = new Date(filters.dateRange.from);
      const toDate = new Date(filters.dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(inspection => {
        const inspectionDate = new Date(inspection.created_at);
        return inspectionDate >= fromDate && inspectionDate <= toDate;
      });
    }

    setFilteredInspections(filtered);
  };

  const getCompletionStats = () => {
    const total = filteredInspections.length;
    const complete = filteredInspections.filter(i => i.completion === 100).length;
    const inProgress = filteredInspections.filter(i => i.completion > 0 && i.completion < 100).length;
    const notStarted = filteredInspections.filter(i => i.completion === 0).length;

    return { total, complete, inProgress, notStarted };
  };

  const stats = getCompletionStats();

  return (
    <div className="container p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie relatórios de inspeções
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.complete}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Progresso</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Não Iniciadas</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.notStarted}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Buscar por título, código ou projeto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </SheetTrigger>
          <SheetContent>
            <ReportFilters
              filters={filters}
              onFiltersChange={setFilters}
              inspections={inspections}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Lista de Inspeções */}
      <div className="space-y-2"> 
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredInspections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-6"> {/* Reduzido de py-8 para py-6 */}
              <FileText className="h-10 w-10 text-muted-foreground mb-3" /> {/* Reduzido de h-12 w-12 mb-4 */}
              <h3 className="text-base font-medium mb-1">Nenhum relatório encontrado</h3> {/* Reduzido */}
              <p className="text-sm text-muted-foreground text-center">
                Ajuste os filtros ou crie novas inspeções para gerar relatórios.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredInspections.map((inspection) => (
            <InspectionReportCard
              key={inspection.id}
              inspection={inspection}
              onView={() => {
                setSelectedInspection(inspection);
                setShowViewer(true);
              }}
              onGeneratePreview={handleGeneratePreview}
            />
          ))
        )}
      </div>

      {/* Visualizador de Relatório */}
      {showViewer && selectedInspection && (
        <ReportViewer
          inspection={selectedInspection}
          open={showViewer}
          onClose={() => {
            setShowViewer(false);
            setSelectedInspection(null);
          }}
        />
      )}
    </div>
  );
}