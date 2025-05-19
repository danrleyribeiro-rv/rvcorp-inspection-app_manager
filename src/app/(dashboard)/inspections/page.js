// app/(dashboard)/inspections/page.js
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Search, Filter } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import InspectionCard from "./components/InspectionCard";
import CreateInspectionDialog from "./components/CreateInspectionDialog";
import EditInspectionDialog from "./components/EditInspectionDialog";
import InspectionDetailsDialog from "./components/InspectionDetailsDialog";
import DeleteInspectionDialog from "./components/DeleteInspectionDialog";
import FilterPanel from "./components/FilterPanel";

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
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchInspections();
    }
  }, [user]);

  useEffect(() => {
    filterInspections();
  }, [inspections, filterState, search]);

  const fetchInspections = async () => {
    setLoading(true);
    try {
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
        return;
      }
      
      // Now, get all inspections for these projects
      const inspectionsQuery = query(
        collection(db, 'inspections'),
        where('project_id', 'in', projectIds),
        where('deleted_at', '==', null),
        orderBy('created_at', 'desc')
      );
      
      const inspectionsSnapshot = await getDocs(inspectionsQuery);
      
      // Process inspections with related data
      const inspectionsData = [];
      
      for (const doc of inspectionsSnapshot.docs) {
        const data = doc.data();
        const inspection = {
          id: doc.id,
          ...data,
          // Verifica e converte os timestamps de maneira segura
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
      
      setInspections(inspectionsData);
      setFilteredInspections(inspectionsData);
    } catch (error) {
      console.error("Error fetching inspections:", error);
      toast({
        title: "Erro ao buscar inspeções",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterInspections = () => {
    const filtered = inspections.filter(inspection => {
      // Search filter
      const matchesSearch =
        (inspection.title?.toLowerCase().includes(search.toLowerCase()) ||
         inspection.projects?.title?.toLowerCase().includes(search.toLowerCase()) ||
         inspection.inspectors?.name?.toLowerCase().includes(search.toLowerCase()) ||
         inspection.projects?.clients?.name?.toLowerCase().includes(search.toLowerCase()));

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

      {loading ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInspections.map((inspection) => (
            <InspectionCard
              key={inspection.id}
              inspection={inspection}
              onEdit={() => setEditingInspection(inspection)}
              onView={() => setViewingInspection(inspection)}
              onDelete={() => setDeletingInspection(inspection)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateInspectionDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onSuccess={fetchInspections}
          managerId={user.uid}
        />
      )}

      {editingInspection && (
        <EditInspectionDialog
          inspection={editingInspection}
          open={!!editingInspection}
          onClose={() => setEditingInspection(null)}
          onSuccess={fetchInspections}
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
          onDelete={fetchInspections}
        />
      )}
    </div>
  );
}