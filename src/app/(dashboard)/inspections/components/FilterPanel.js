// app/(dashboard)/inspections/components/FilterPanel.js
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Label } from "@/components/ui/label";
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/context/auth-context";
import { getInternalStatusOptions } from "@/utils/inspection-status";

export default function FilterPanel({ filterState, onFilterChange, inspections }) {
  const [projects, setProjects] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [dateRange, setDateRange] = useState(filterState.dateRange);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchInspectors();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      // TODO: Restringir por manager_id quando necessário
      // const projectsQuery = query(
      //   collection(db, 'projects'),
      //   where('manager_id', '==', user.uid),
      //   where('deleted_at', '==', null)
      // );
      const projectsQuery = query(
        collection(db, 'projects'),
        where('deleted_at', '==', null)
      );
      
      const projectsSnapshot = await getDocs(projectsQuery);
      
      const projectsData = projectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setProjects(projectsData || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchInspectors = async () => {
    try {
      const inspectorsQuery = query(
        collection(db, 'inspectors'),
        where('deleted_at', '==', null)
      );
      
      const inspectorsSnapshot = await getDocs(inspectorsQuery);
      
      const inspectorsData = inspectorsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setInspectors(inspectorsData || []);
    } catch (error) {
      console.error("Error fetching inspectors:", error);
    }
  };

  // Get unique inspector IDs from inspections
  const getActiveInspectors = () => {
    const inspectorIds = new Set();
    inspections.forEach(inspection => {
      if (inspection.inspector_id) {
        inspectorIds.add(inspection.inspector_id);
      }
    });
    return inspectors.filter(inspector => inspectorIds.has(inspector.id));
  };

  // Get unique project IDs from inspections
  const getActiveProjects = () => {
    const projectIds = new Set();
    inspections.forEach(inspection => {
      if (inspection.project_id) {
        projectIds.add(inspection.project_id);
      }
    });
    return projects.filter(project => projectIds.has(project.id));
  };

  // Get unique states from inspections
  function getActiveStates() {
    const states = new Set();
    inspections.forEach(inspection => {
      if (inspection.address?.state) states.add(inspection.address.state);
    });
    return Array.from(states).sort();
  }

  // Get unique cities from inspections, optionally filtered by state
  function getActiveCities(selectedState) {
    const cities = new Set();
    inspections.forEach(inspection => {
      if (
        inspection.address?.city &&
        (!selectedState || inspection.address.state === selectedState)
      ) {
        cities.add(inspection.address.city);
      }
    });
    return Array.from(cities).sort();
  }

  const handleReset = () => {
    const resetState = {
      status: "all",
      project: "all",
      inspector: "all",
      state: "all",
      city: "all",
      dateRange: null
    };
    onFilterChange(resetState);
    setDateRange(null);
  };

  return (
    <SheetContent>
      <SheetHeader>
        <SheetTitle>Filtros</SheetTitle>
      </SheetHeader>
      
      <div className="space-y-6 pt-6">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={filterState.status}
            onValueChange={(value) => onFilterChange({
              ...filterState,
              status: value
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              {getInternalStatusOptions().map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Projeto</Label>
          <Select
            value={filterState.project}
            onValueChange={(value) => onFilterChange({ ...filterState, project: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os projetos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {getActiveProjects().map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Lincer</Label>
          <Select
            value={filterState.inspector}
            onValueChange={(value) => onFilterChange({ ...filterState, inspector: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os lincers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {getActiveInspectors().map((inspector) => (
                <SelectItem key={inspector.id} value={inspector.id}>
                  {`${inspector.name} ${inspector.last_name || ''}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Estado e Cidade lado a lado */}
        <div className="flex gap-2">
          <div className="flex-1 space-y-2">
            <Label>Estado</Label>
            <Select
              value={filterState.state || "all"}
              onValueChange={value => onFilterChange({ ...filterState, state: value, city: "all" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {getActiveStates().map(state => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-2">
            <Label>Cidade</Label>
            <Select
              value={filterState.city || "all"}
              onValueChange={value => onFilterChange({ ...filterState, city: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as cidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {getActiveCities(filterState.state === "all" ? null : filterState.state).map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Período com largura limitada */}
        <div className="space-y-2">
          <Label>Período</Label>
          <div className="max-w-xs">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={range => {
                setDateRange(range);
                onFilterChange({ ...filterState, dateRange: range });
              }}
              numberOfMonths={1}
              className="rounded-md border"
            />
          </div>
        </div>

        <Button onClick={handleReset} variant="outline" className="w-full">
          Limpar Filtros
        </Button>
      </div>
    </SheetContent>
  );
}