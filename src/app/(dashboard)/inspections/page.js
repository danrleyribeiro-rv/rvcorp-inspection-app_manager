// app/(dashboard)/inspections/page.js
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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
    dateRange: null
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
      const { data, error } = await supabase
        .from('inspections')
        .select(`
          id,
          title,
          observation,
          status,
          scheduled_date,
          project_id,
          inspector_id,
          inspectors:inspector_id(name,last_name),
          projects:project_id(title, client_id, clients!inner(name))
        `)
        .eq('projects.manager_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInspections(data || []);
      setFilteredInspections(data || []);
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

      // Date range filter
      let matchesDateRange = true;
      if (filterState.dateRange?.from && filterState.dateRange?.to && inspection.scheduled_date) {
        const inspectionDate = new Date(inspection.scheduled_date);
        matchesDateRange =
          inspectionDate >= filterState.dateRange.from &&
          inspectionDate <= filterState.dateRange.to;
      }

      return matchesSearch && matchesStatus && matchesProject && matchesInspector && matchesDateRange;
    });

    setFilteredInspections(filtered);
  };

  return (
    <div className="container p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Inspeções</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Inspeção
        </Button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Buscar inspeções..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>
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
          managerId={user.id}
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