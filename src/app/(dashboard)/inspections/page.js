// src/app/(dashboard)/inspections/page.js
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  startAfter,
  doc, // Added for fetching individual documents
  getDoc // Added for fetching individual documents
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Filter, Loader2, List, Grid, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import InspectionListItem from "./components/InspectionListItem";
import DeleteInspectionDialog from "./components/DeleteInspectionDialog";
import FilterPanel from "./components/FilterPanel";
import InspectionReportCard from "../reports/components/InspectionReportCard";
import ReportViewer from "../reports/components/ReportViewer";
import { generateInspectionPDF, generateNonConformitiesPDF } from "@/services/pdf-service";
import { generateReportDownloadUrl } from "@/services/report-service";

const INSPECTIONS_PER_PAGE = 10;

export default function InspectionsPage() {
  const [inspections, setInspections] = useState([]);
  const [filteredInspections, setFilteredInspections] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingInspection, setEditingInspection] = useState(null);
  const [deletingInspection, setDeletingInspection] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [filterState, setFilterState] = useState({
    status: "all",
    project: "all",
    inspector: "all",
    dateRange: null,
    state: "all",
    city: "all"
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const observerRef = useRef();
  const listEndRef = useRef(null); // This ref can be removed if not strictly used by observer anymore

  useEffect(() => {
    if (user) {
      resetAndFetchInspections();
    }
  }, [user]); // Dependency on user

  useEffect(() => {
    // Determine if any filter is active besides default state
    const defaultFilterState = {
      status: "all", project: "all", inspector: "all",
      dateRange: null, state: "all", city: "all"
    };
    const filtersApplied = search.trim() !== "" || JSON.stringify(filterState) !== JSON.stringify(defaultFilterState);

    if (filtersApplied) {
      setIsFiltering(true);
      filterInspections();
    } else {
      setIsFiltering(false);
      setFilteredInspections(inspections); // If no filters, show all fetched inspections
    }
  }, [inspections, filterState, search]);


  const resetAndFetchInspections = async () => {
    setInspections([]);
    setFilteredInspections([]); // Also reset filtered
    setLastVisible(null);
    setHasMore(true);
    setLoading(true);
    await fetchInspections(true); // Pass true for first batch
  };

  const fetchInspections = async (isFirstBatch = false) => {
    if (!user) { // Ensure user is available
        setLoading(false);
        return;
    }
    if (!isFirstBatch && !hasMore) return;
    
    try {
      if (isFirstBatch) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // First, get all projects for this manager
      const projectsQuery = query(
        collection(db, 'projects'),
        where('manager_id', '==', user.uid),
        where('deleted_at', '==', null)
      );
      
      const projectsSnapshot = await getDocs(projectsQuery);
      const projectIds = projectsSnapshot.docs.map(doc => doc.id);
      
      // If no projects, and it's the first batch, there are no inspections to fetch for this manager.
      if (projectIds.length === 0 && isFirstBatch) {
        setInspections([]);
        setFilteredInspections([]);
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }
      
      // Now, get inspections with pagination
      let inspectionsQuery;
      // Firestore 'in' queries are limited. If projectIds is empty, provide a non-matching placeholder.
      const projectIdsForQuery = projectIds.length > 0 ? projectIds : ['non-existent-project-id'];
      
      if (isFirstBatch) {
        inspectionsQuery = query(
          collection(db, 'inspections'),
          where('project_id', 'in', projectIdsForQuery.slice(0, 10)), // Max 10 for 'in'
          where('deleted_at', '==', null),
          orderBy('created_at', 'desc'),
          limit(INSPECTIONS_PER_PAGE)
        );
      } else {
        inspectionsQuery = query(
          collection(db, 'inspections'),
          where('project_id', 'in', projectIdsForQuery.slice(0, 10)), // Max 10 for 'in'
          where('deleted_at', '==', null),
          orderBy('created_at', 'desc'),
          startAfter(lastVisible),
          limit(INSPECTIONS_PER_PAGE)
        );
      }
      
      const inspectionsSnapshot = await getDocs(inspectionsQuery);
      
      const lastDoc = inspectionsSnapshot.docs[inspectionsSnapshot.docs.length - 1];
      setLastVisible(lastDoc);
      setHasMore(inspectionsSnapshot.docs.length === INSPECTIONS_PER_PAGE);
      
      const inspectionsDataPromises = inspectionsSnapshot.docs.map(async (inspectionDoc) => {
        const data = inspectionDoc.data();
        const inspection = {
          id: inspectionDoc.id,
          ...data,
          created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : data.created_at,
          updated_at: data.updated_at?.toDate ? data.updated_at.toDate().toISOString() : data.updated_at,
          scheduled_date: data.scheduled_date?.toDate ? data.scheduled_date.toDate().toISOString() : data.scheduled_date
        };
        
        // Get project data
        if (inspection.project_id) {
          const project = projectsSnapshot.docs.find(pDoc => pDoc.id === inspection.project_id);
          if (project) {
            inspection.projects = { id: project.id, ...project.data() };
            // Get client data if available
            if (inspection.projects.client_id) {
              try {
                const clientRef = doc(db, 'clients', inspection.projects.client_id);
                const clientSnap = await getDoc(clientRef);
                if (clientSnap.exists()) {
                  inspection.projects.clients = { id: clientSnap.id, ...clientSnap.data() };
                }
              } catch (err) { console.error("Error fetching client:", err); }
            }
          }
        }
        
        // Get inspector data
        if (inspection.inspector_id) {
          try {
            const inspectorRef = doc(db, 'inspectors', inspection.inspector_id);
            const inspectorSnap = await getDoc(inspectorRef);
            if (inspectorSnap.exists()) {
              inspection.inspectors = { id: inspectorSnap.id, ...inspectorSnap.data() };
            }
          } catch (err) { console.error("Error fetching inspector:", err); }
        }

        // Fetch Template Data
        if (inspection.template_id) {
            try {
              const templateRef = doc(db, 'templates', inspection.template_id);
              const templateSnap = await getDoc(templateRef);
              if (templateSnap.exists()) {
                inspection.template_details = { id: templateSnap.id, ...templateSnap.data() };
              } else {
                inspection.template_details = null; 
                console.warn(`Template with ID ${inspection.template_id} not found for inspection ${inspection.id}.`);
              }
            } catch (err) {
              console.error(`Error fetching template details for inspection ${inspection.id}:`, err);
              inspection.template_details = null;
            }
        }

        // Fetch releases
        try {
          const releasesQuery = query(
            collection(db, 'inspection_releases'),
            where('inspection_id', '==', inspectionDoc.id),
            orderBy('created_at', 'desc')
          );
          const releasesSnapshot = await getDocs(releasesQuery);
          inspection.releases = releasesSnapshot.docs.map(releaseDoc => ({
            id: releaseDoc.id,
            ...releaseDoc.data(),
            created_at: releaseDoc.data().created_at?.toDate?.()?.toISOString()
          }));
        } catch (err) {
          console.error(`Error fetching releases for inspection ${inspection.id}:`, err);
          inspection.releases = [];
        }
        
        return inspection;
      });

      const resolvedInspectionsData = await Promise.all(inspectionsDataPromises);
      
      if (isFirstBatch) {
        setInspections(resolvedInspectionsData);
      } else {
        setInspections(prevInspections => [...prevInspections, ...resolvedInspectionsData]);
      }
      
    } catch (error) {
      console.error("Error fetching inspections:", error);
      toast({ title: "Erro ao buscar inspeções", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const lastInspectionElementRef = useCallback(node => {
    if (loading || loadingMore || isFiltering) return; // Don't trigger if filtering
    
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchInspections(); // Fetch next batch
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [loading, loadingMore, hasMore, isFiltering, fetchInspections]); // Added fetchInspections to dependencies

  const handleEditData = (inspection) => {
    setEditingInspection(inspection);
  };

  const handleEditInspection = (inspection) => {
    router.push(`/inspections/${inspection.id}/editor`);
  };

  const handlePreviewPDF = async (inspection) => {
    toast({
      title: "Gerando Preview do PDF",
      description: "Por favor, aguarde...",
    });
    try {
      const result = await generateInspectionPDF(inspection, { isPreview: true, inspectionCode: inspection.cod });
      if (result.success) {
        console.log("Generated PDF URL:", result.url); // Add this line
        openPDFInNewTab(result.url);
        toast({
          title: "Preview gerado com sucesso!",
          description: "O preview do PDF foi aberto em uma nova aba.",
        });
      } else {
        throw new Error("Falha ao gerar o PDF.");
      }
    } catch (error) {
      console.error("Error in handlePreviewPDF:", error);
      toast({
        title: "Erro ao gerar Preview do PDF",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
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
      const downloadUrl = generateReportDownloadUrl(inspection, type);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${inspection.cod || inspection.id}_${type}_${Date.now()}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
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

  const filterInspections = () => {
    const lowerCaseSearch = search.toLowerCase();
    const filtered = inspections.filter(inspection => {
      const matchesSearch = search.trim() === "" || (
        inspection.title?.toLowerCase().includes(lowerCaseSearch) ||
        inspection.cod?.toLowerCase().includes(lowerCaseSearch) ||
        inspection.projects?.title?.toLowerCase().includes(lowerCaseSearch) ||
        inspection.inspectors?.name?.toLowerCase().includes(lowerCaseSearch) ||
        inspection.projects?.clients?.name?.toLowerCase().includes(lowerCaseSearch) ||
        inspection.observation?.toLowerCase().includes(lowerCaseSearch) ||
        (inspection.topics && inspection.topics.some(topic => 
          topic.name?.toLowerCase().includes(lowerCaseSearch) ||
          topic.description?.toLowerCase().includes(lowerCaseSearch) ||
          (topic.items && topic.items.some(item =>
            item.name?.toLowerCase().includes(lowerCaseSearch) ||
            item.description?.toLowerCase().includes(lowerCaseSearch)
          ))
        ))
      );

      const matchesStatus = filterState.status === "all" || inspection.status === filterState.status;
      const matchesProject = filterState.project === "all" || inspection.project_id === filterState.project;
      const matchesInspector = filterState.inspector === "all" || inspection.inspector_id === filterState.inspector;
      const matchesState = filterState.state === "all" || inspection.address?.state === filterState.state;
      const matchesCity = filterState.city === "all" || inspection.address?.city === filterState.city;

      let matchesDateRange = true;
      if (filterState.dateRange?.from && filterState.dateRange?.to && inspection.scheduled_date) {
        const inspectionDate = new Date(inspection.scheduled_date);
        const fromDate = new Date(filterState.dateRange.from);
        const toDate = new Date(filterState.dateRange.to);
        // Set time to ensure full day coverage
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        matchesDateRange = inspectionDate >= fromDate && inspectionDate <= toDate;
      }
      return matchesSearch && matchesStatus && matchesProject && matchesInspector && matchesState && matchesCity && matchesDateRange;
    });
    setFilteredInspections(filtered);
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

  const getInspectionStats = () => {
    const inspectionsWithCompletion = filteredInspections.map(inspection => ({
      ...inspection,
      completion: calculateCompletion(inspection)
    }));

    const total = inspectionsWithCompletion.length;
    const complete = inspectionsWithCompletion.filter(i => i.completion === 100).length;
    const inProgress = inspectionsWithCompletion.filter(i => i.completion > 0 && i.completion < 100).length;
    const notStarted = inspectionsWithCompletion.filter(i => i.completion === 0).length;

    return { total, complete, inProgress, notStarted };
  };

  const stats = getInspectionStats();

  return (
    <div className="container p-4 md:p-6 mx-auto max-w-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Inspeções</h1>
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

      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between">
        <Input
          placeholder="Buscar inspeções (título, cod, projeto, cliente...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-full sm:max-w-md lg:max-w-lg"
        />
      <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
        <Button onClick={() => router.push('/inspections/create')} className="flex-1 sm:flex-none">
          <Plus className="mr-2 h-4 w-4" />
          Nova Inspeção
        </Button>
        <Button
          variant={viewMode === "list" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("list")}
          className="px-3"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === "cards" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("cards")}
          className="px-3"
        >
          <Grid className="h-4 w-4" />
        </Button>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex-1 sm:flex-none">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </SheetTrigger>
          <FilterPanel
            filterState={filterState}
            onFilterChange={setFilterState}
            inspections={inspections}
          />
        </Sheet>
      </div>
      </div>

      {loading && inspections.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      ) : filteredInspections.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {inspections.length === 0 ?
            "Nenhuma inspeção encontrada. Crie uma nova inspeção para começar." :
            "Nenhuma inspeção corresponde aos filtros e busca aplicados."}
        </div>
      ) : (
        <>
          {viewMode === "list" ? (
            <div className="space-y-3">
              {filteredInspections.map((inspection, index) => {
                if (index === filteredInspections.length - 1 && !isFiltering && hasMore) {
                  return (
                    <div key={inspection.id} ref={lastInspectionElementRef}>
                      <InspectionListItem
                        inspection={inspection}
                        onEditData={() => handleEditData(inspection)}
                        onEditInspection={() => handleEditInspection(inspection)}
                        onDelete={() => setDeletingInspection(inspection)}
                        onPreviewPDF={handlePreviewPDF}
                      />
                    </div>
                  );
                } else {
                  return (
                    <InspectionListItem
                      key={inspection.id}
                      inspection={inspection}
                      onEditData={() => handleEditData(inspection)}
                      onEditInspection={() => handleEditInspection(inspection)}
                      onDelete={() => setDeletingInspection(inspection)}
                    />
                  );
                }
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredInspections.map((inspection, index) => {
                if (index === filteredInspections.length - 1 && !isFiltering && hasMore) {
                  return (
                    <div key={inspection.id} ref={lastInspectionElementRef}>
                      <InspectionReportCard 
                        inspection={{...inspection, completion: calculateCompletion(inspection)}}
                        onView={() => {
                          setSelectedInspection(inspection);
                          setShowViewer(true);
                        }}
                        onGeneratePreview={(inspection, release) => handleGenerateReport(generateInspectionPDF, inspection, release)}
                        onGenerateNCPDF={(inspection, release) => handleGenerateReport(generateNonConformitiesPDF, inspection, release)}
                        onGenerateHTMLReport={handleGenerateHTMLReport}
                        onViewHTMLReport={handleViewHTMLReport}
                      />
                    </div>
                  );
                } else {
                  return (
                    <InspectionReportCard 
                      key={inspection.id} 
                      inspection={{...inspection, completion: calculateCompletion(inspection)}}
                      onView={() => {
                        setSelectedInspection(inspection);
                        setShowViewer(true);
                      }}
                      onGeneratePreview={(inspection, release) => handleGenerateReport(generateInspectionPDF, inspection, release)}
                      onGenerateNCPDF={(inspection, release) => handleGenerateReport(generateNonConformitiesPDF, inspection, release)}
                      onGenerateHTMLReport={handleGenerateHTMLReport}
                      onViewHTMLReport={handleViewHTMLReport}
                    />
                  );
                }
              })}
            </div>
          )}
          
          {loadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          
          {!hasMore && !loading && inspections.length > 0 && !isFiltering && (
             <p className="text-center text-sm text-muted-foreground py-4">Fim da lista de inspeções.</p>
          )}
        </>
      )}

      {showCreate && (
        <CreateInspectionDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onSuccess={resetAndFetchInspections}
          managerId={user?.uid} // Pass user.uid safely
        />
      )}


      {deletingInspection && (
        <DeleteInspectionDialog
          inspection={deletingInspection}
          open={!!deletingInspection}
          onClose={() => setDeletingInspection(null)}
          onDelete={resetAndFetchInspections}
        />
      )}

      {/* Report Viewer */}
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