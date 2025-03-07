
// app/(dashboard)/inspections/components/FilterPanel.js
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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
      const { data, error } = await supabase
        .from('projects')
        .select('id, title')
        .eq('manager_id', user.id)
        .is('deleted_at', null);
      
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchInspectors = async () => {
    try {
      const { data, error } = await supabase
        .from('inspectors')
        .select('id, name, last_name')
        .is('deleted_at', null);
      
      if (error) throw error;
      setInspectors(data || []);
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

  const handleReset = () => {
    const resetState = {
      status: "all",
      project: "all",
      inspector: "all",
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
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="completed">Concluída</SelectItem>
              <SelectItem value="canceled">Cancelada</SelectItem>
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
          <Label>Vistoriador</Label>
          <Select
            value={filterState.inspector}
            onValueChange={(value) => onFilterChange({ ...filterState, inspector: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os vistoriadores" />
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

        <div className="space-y-2">
          <Label>Período</Label>
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={(range) => {
              setDateRange(range);
              onFilterChange({ ...filterState, dateRange: range });
            }}
            numberOfMonths={1}
            className="rounded-md border"
          />
        </div>

        <Button onClick={handleReset} variant="outline" className="w-full">
          Limpar Filtros
        </Button>
      </div>
    </SheetContent>
  );
}