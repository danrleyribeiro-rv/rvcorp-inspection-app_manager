// src/app/(dashboard)/reports/page.js
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  FileText, 
  Filter, 
  Download, 
  Eye, 
  Search,
  Calendar,
  Building,
  User
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import ReportFilters from "./components/ReportFilters";
import InspectionReportCard from "./components/InspectionReportCard";
import ReportViewer from "./components/ReportViewer";
import { generateInspectionPDF, generateNonConformitiesPDF } from "@/services/pdf-service";
import { generateReportDownloadUrl, uploadReportToStorage } from "@/services/report-service";

export default function ReportsPage() {
  const [inspections, setInspections] = useState([]);
  const [filteredInspections, setFilteredInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
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

  const handleGenerateReport = async (reportGenerator, inspection, release = null) => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    
    const { id: toastId, update: updateToast } = toast({
      title: "Gerando PDF...",
      description: "Aguarde enquanto preparamos o seu relatório.",
    });

    try {
      const result = await reportGenerator(inspection, release);
      
      updateToast({
        id: toastId,
        title: result.success ? "PDF Gerado com Sucesso!" : "Falha ao Gerar PDF",
        description: result.success ? "O download começará em breve." : result.error,
        variant: result.success ? "success" : "destructive",
      });

    } catch (error) {
      updateToast({
        id: toastId,
        title: "Erro Inesperado",
        description: "Ocorreu um erro inesperado ao gerar o PDF.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleGenerateHTMLReport = async (inspection, type = 'complete') => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    
    const { id: toastId, update: updateToast } = toast({
      title: "Gerando Relatório HTML...",
      description: "Aguarde enquanto preparamos o seu relatório.",
    });

    try {
      // Generate download URL for HTML report
      const downloadUrl = generateReportDownloadUrl(inspection, type);
      
      // Create download link
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${inspection.cod || inspection.id}_${type}_${Date.now()}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
      
      updateToast({
        id: toastId,
        title: "Relatório HTML Gerado!",
        description: "O download foi iniciado.",
        variant: "default",
      });

    } catch (error) {
      console.error('Error generating HTML report:', error);
      updateToast({
        id: toastId,
        title: "Erro ao Gerar Relatório",
        description: "Ocorreu um erro inesperado ao gerar o relatório HTML.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleViewHTMLReport = async (inspection, type = 'complete') => {
    try {
      const downloadUrl = generateReportDownloadUrl(inspection, type);
      window.open(downloadUrl, '_blank');
      
      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
      
      toast({
        title: "Relatório Aberto",
        description: "O relatório foi aberto em uma nova aba.",
      });

    } catch (error) {
      console.error('Error viewing HTML report:', error);
      toast({
        title: "Erro ao Visualizar Relatório",
        description: "Ocorreu um erro ao abrir o relatório.",
        variant: "destructive",
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
            <CardContent className="flex flex-col items-center justify-center py-6">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-base font-medium mb-1">Nenhum relatório encontrado</h3>
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
              onGeneratePreview={(inspection, release) => handleGenerateReport(generateInspectionPDF, inspection, release)}
              onGenerateNCPDF={(inspection, release) => handleGenerateReport(generateNonConformitiesPDF, inspection, release)}
              onGenerateHTMLReport={handleGenerateHTMLReport}
              onViewHTMLReport={handleViewHTMLReport}
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
          onGeneratePreview={(inspection, release) => handleGenerateReport(generateInspectionPDF, inspection, release)}
          onGenerateNCPDF={(inspection, release) => handleGenerateReport(generateNonConformitiesPDF, inspection, release)}
          onGenerateHTMLReport={handleGenerateHTMLReport}
          onViewHTMLReport={handleViewHTMLReport}
        />
      )}
    </div>
  );
}