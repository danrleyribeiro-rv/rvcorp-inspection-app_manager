// src/app/(dashboard)/inspections/page.js
"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Search, Filter } from "lucide-react";
import InspectionCard from "./components/InspectionCard";
import CreateInspectionDialog from "./components/CreateInspectionDialog";
import EditInspectionDialog from "./components/EditInspectionDialog";
import InspectionDetailsDialog from "./components/InspectionDetailsDialog";
import FilterPanel from "./components/FilterPanel";

export default function InspectionsPage() {
  const [inspections, setInspections] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingInspection, setEditingInspection] = useState(null);
  const [viewingInspection, setViewingInspection] = useState(null);
  const [filterState, setFilterState] = useState({
    status: "all",
    project: "all",
    inspector: "all",
    dateRange: null
  });
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(collection(db, "inspections"));
    return onSnapshot(q, (snapshot) => {
      const inspectionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInspections(filterInspections(inspectionsData));
    });
  }, [filterState, search]);

  const filterInspections = (data) => {
    return data.filter(inspection => {
      const matchesSearch = inspection.projectName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterState.status === "all" || inspection.status === filterState.status;
      const matchesProject = filterState.project === "all" || inspection.projectId === filterState.project;
      const matchesInspector = filterState.inspector === "all" || inspection.inspectorId === filterState.inspector;
      
      let matchesDateRange = true;
      if (filterState.dateRange?.from && filterState.dateRange?.to) {
        const inspectionDate = new Date(inspection.scheduledDate);
        matchesDateRange = inspectionDate >= filterState.dateRange.from && 
                          inspectionDate <= filterState.dateRange.to;
      }

      return matchesSearch && matchesStatus && matchesProject && 
             matchesInspector && matchesDateRange;
    });
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
          />
        </Sheet>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {inspections.map((inspection) => (
          <InspectionCard
            key={inspection.id}
            inspection={inspection}
            onEdit={() => setEditingInspection(inspection)}
            onView={() => setViewingInspection(inspection)}
          />
        ))}
      </div>

      {showCreate && (
        <CreateInspectionDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editingInspection && (
        <EditInspectionDialog
          inspection={editingInspection}
          open={!!editingInspection}
          onClose={() => setEditingInspection(null)}
        />
      )}

      {viewingInspection && (
        <InspectionDetailsDialog
          inspection={viewingInspection}
          open={!!viewingInspection}
          onClose={() => setViewingInspection(null)}
        />
      )}
    </div>
  );
}