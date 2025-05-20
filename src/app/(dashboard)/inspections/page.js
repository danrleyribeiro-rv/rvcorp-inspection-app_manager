// src/app/(dashboard)/inspections/page.js
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit, startAfter } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Search, Filter, Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import InspectionListItem from "./components/InspectionListItem";
import CreateInspectionDialog from "./components/CreateInspectionDialog";
import EditInspectionDialog from "./components/EditInspectionDialog";
import InspectionDetailsDialog from "./components/InspectionDetailsDialog";
import DeleteInspectionDialog from "./components/DeleteInspectionDialog";
import FilterPanel from "./components/FilterPanel";

const INSPECTIONS_PER_PAGE = 10;

export default function InspectionsPage() {
  const [inspections, setInspections] = useState([]);
  const [filteredInspections, setFilteredInspections] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingInspection, setEditingInspection] = useState(null);
  const [viewingInspection, setViewingInspection] = useState(null);
  const [deletingInspection, setDeletingInspection] = useState(null);
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
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const observerRef = useRef();
  const listEndRef = useRef(null);

  useEffect(() => {
    if (user) {
      resetAndFetchInspections();
    }
  }, [user]);

  useEffect(() => {
    if (search !== "" || JSON.stringify(filterState) !== JSON.stringify({
      status: "all",
      project: "all",
      inspector: "all",
      dateRange: null,
      state: "all",
      city: "all"
    })) {
      setIsFiltering(true);
      filterInspections();
    } else {
      setIsFiltering(false);
      setFilteredInspections(inspections);
    }
  }, [inspections, filterState, search]);

  // Reset pagination and fetch first batch
  const resetAndFetchInspections = async () => {
    setInspections([]);
    setLastVisible(null);
    setHasMore(true);
    setLoading(true);
    await fetchInspections(true);
  };

  const fetchInspections = async (isFirstBatch = false) => {
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
      
      if (projectIds.length === 0) {
        setInspections([]);
        setFilteredInspections([]);
        setLoading(false);
        setLoadingMore(false);
        setHasMore(false);
        return;
      }
      
      // Now, get inspections with pagination
      let inspectionsQuery;
      
      if (isFirstBatch) {
        inspectionsQuery = query(
          collection(db, 'inspections'),
          where('project_id', 'in', projectIds.slice(0, 10)), // Firestore limits 'in' to 10 values
          where('deleted_at', '==', null),
          orderBy('created_at', 'desc'),
          limit(INSPECTIONS_PER_PAGE)
        );
      } else {
        inspectionsQuery = query(
          collection(db, 'inspections'),
          where('project_id', 'in', projectIds.slice(0, 10)),
          where('deleted_at', '==', null),
          orderBy('created_at', 'desc'),
          startAfter(lastVisible),
          limit(INSPECTIONS_PER_PAGE)
        );
      }
      
      const inspectionsSnapshot = await getDocs(inspectionsQuery);
      
      // Update lastVisible for pagination
      const lastDoc = inspectionsSnapshot.docs[inspectionsSnapshot.docs.length - 1];
      setLastVisible(lastDoc);
      
      // Check if there are more results
      setHasMore(inspectionsSnapshot.docs.length === INSPECTIONS_PER_PAGE);
      
      // Process inspections with related data
      const inspectionsData = [];
      
      for (const doc of inspectionsSnapshot.docs) {
        const data = doc.data();
        const inspection = {
          id: doc.id,
          ...data,
          // Convert Firebase timestamps to ISO strings for easier handling
          created_at: data.created_at && typeof data.created_at.toDate === 'function' 
            ? data.created_at.toDate().toISOString() 
            : data.created_at,
          updated_at: data.updated_at && typeof data.updated_at.toDate === 'function'
            ? data.updated_at.toDate().toISOString()
            : data.updated_at,
          scheduled_date: data.scheduled_date && typeof data.scheduled_date.toDate === 'function'
            ? data.scheduled_date.toDate().toISOString()
            : data.scheduled_date
        };
        
        // Get project data
        if (inspection.project_id) {
          const project = projectsSnapshot.docs.find(doc => doc.id === inspection.project_id);
          if (project) {
            inspection.projects = {
              id: project.id,
              ...project.data()
            };
            
            // Get client data if available
            if (inspection.projects.client_id) {
              try {
                const clientSnapshot = await getDocs(
                  query(
                    collection(db, 'clients'),
                    where('__name__', '==', inspection.projects.client_id)
                  )
                );
                
                if (!clientSnapshot.empty) {
                  inspection.projects.clients = {
                    id: clientSnapshot.docs[0].id,
                    ...clientSnapshot.docs[0].data()
                  };
                }
              } catch (err) {
                console.error("Error fetching client:", err);
              }
            }
          }
        }
        
        // Get inspector data
        if (inspection.inspector_id) {
          try {
            const inspectorSnapshot = await getDocs(
              query(
                collection(db, 'inspectors'),
                where('__name__', '==', inspection.inspector_id)
              )
            );
            
            if (!inspectorSnapshot.empty) {
              inspection.inspectors = {
                id: inspectorSnapshot.docs[0].id,
                ...inspectorSnapshot.docs[0].data()
              };
            }
          } catch (err) {
            console.error("Error fetching inspector:", err);
          }
        }
        
        inspectionsData.push(inspection);
      }
      
      // Update inspections state (append or replace)
      if (isFirstBatch) {
        setInspections(inspectionsData);
      } else {
        setInspections(prevInspections => [...prevInspections, ...inspectionsData]);
      }
      
    } catch (error) {
      console.error("Error fetching inspections:", error);
      toast({
        title: "Erro ao buscar inspeções",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Intersection Observer for infinite scrolling
  const lastInspectionElementRef = useCallback(node => {
    if (loading || loadingMore) return;
    
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !isFiltering) {
        fetchInspections();
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [loading, loadingMore, hasMore, isFiltering]);

  const handleEditData = (inspection) => {
    setEditingInspection(inspection);
  };

  const handleEditInspection = (inspection) => {
    router.push(`/inspections/${inspection.id}/editor`);
  };

  const filterInspections = () => {
    const filtered = inspections.filter(inspection => {
      // Search filter - now includes topics and items
      const matchesSearch = search === "" || (
        inspection.title?.toLowerCase().includes(search.toLowerCase()) ||
        inspection.projects?.title?.toLowerCase().includes(search.toLowerCase()) ||
        inspection.inspectors?.name?.toLowerCase().includes(search.toLowerCase()) ||
        inspection.projects?.clients?.name?.toLowerCase().includes(search.toLowerCase()) ||
        inspection.observation?.toLowerCase().includes(search.toLowerCase()) ||
        // Search in topics
        (inspection.topics && inspection.topics.some(topic => 
          topic.name?.toLowerCase().includes(search.toLowerCase()) ||
          topic.description?.toLowerCase().includes(search.toLowerCase()) ||
          // Search in items
          (topic.items && topic.items.some(item =>
            item.name?.toLowerCase().includes(search.toLowerCase()) ||
            item.description?.toLowerCase().includes(search.toLowerCase())
          ))
        ))
      );

      // Status filter
      const matchesStatus = filterState.status === "all" || inspection.status === filterState.status;

      // Project filter
      const matchesProject = filterState.project === "all" || inspection.project_id === filterState.project;

      // Inspector filter
      const matchesInspector = filterState.inspector === "all" || inspection.inspector_id === filterState.inspector;

      // State filter
      const matchesState = filterState.state === "all" || inspection.address?.state === filterState.state;

      // City filter
      const matchesCity = filterState.city === "all" || inspection.address?.city === filterState.city;

      // Date range filter
      let matchesDateRange = true;
      if (filterState.dateRange?.from && filterState.dateRange?.to && inspection.scheduled_date) {
        const inspectionDate = new Date(inspection.scheduled_date);
        matchesDateRange =
          inspectionDate >= filterState.dateRange.from &&
          inspectionDate <= filterState.dateRange.to;
      }

      return matchesSearch && matchesStatus && matchesProject && matchesInspector && matchesState && matchesCity && matchesDateRange;
    });

    setFilteredInspections(filtered);
  };

  return (
    <div className="container p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Inspeções</h1>
      </div>

      <div className="flex gap-4 mb-6 items-center justify-between">
        <Input
          placeholder="Buscar inspeções..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <div className="flex gap-4">
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Inspeção
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredInspections.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {inspections.length === 0 ?
            "Nenhuma inspeção encontrada. Crie uma nova inspeção para começar." :
            "Nenhuma inspeção corresponde aos filtros aplicados."}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredInspections.map((inspection, index) => {
            // If this is the last item and we're not filtering, add ref for infinite scroll
            if (index === filteredInspections.length - 1 && !isFiltering) {
              return (
                <div key={inspection.id} ref={lastInspectionElementRef}>
                  <InspectionListItem
                    inspection={inspection}
                    onEditData={() => handleEditData(inspection)}
                    onEditInspection={() => handleEditInspection(inspection)}
                    onView={() => setViewingInspection(inspection)}
                    onDelete={() => setDeletingInspection(inspection)}
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
                  onView={() => setViewingInspection(inspection)}
                  onDelete={() => setDeletingInspection(inspection)}
                />
              );
            }
          })}
          
          {/* Loading indicator for more items */}
          {loadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          
          {/* If we're filtering and there are more items in the original dataset, show a load more button */}
          {isFiltering && !loading && inspections.length > filteredInspections.length && hasMore && (
            <div className="flex justify-center py-4">
              <Button 
                variant="outline" 
                onClick={() => fetchInspections()}
                disabled={loadingMore}
              >
                {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Carregar mais
              </Button>
            </div>
          )}
          
          {/* End of list marker for intersection observer */}
          <div ref={listEndRef} />
        </div>
      )}

      {showCreate && (
        <CreateInspectionDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onSuccess={resetAndFetchInspections}
          managerId={user.uid}
        />
      )}

      {editingInspection && (
        <EditInspectionDialog
          inspection={editingInspection}
          open={!!editingInspection}
          onClose={() => setEditingInspection(null)}
          onSuccess={resetAndFetchInspections}
        />
      )}

      {viewingInspection && (
        <InspectionDetailsDialog
          inspection={viewingInspection}
          open={!!viewingInspection}
          onClose={() => setViewingInspection(null)}
          onEdit={(inspection) => {
            setEditingInspection(inspection);
            setViewingInspection(null);
          }}
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
    </div>
  );
}