// src/app/(dashboard)/inspections/components/FilterPanel.js
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
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

export default function FilterPanel({ filterState, onFilterChange }) {
  const [projects, setProjects] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [dateRange, setDateRange] = useState(filterState.dateRange);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [projectsSnap, inspectorsSnap] = await Promise.all([
      getDocs(collection(db, "projects")),
      getDocs(collection(db, "inspectors"))
    ]);

    setProjects(projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setInspectors(inspectorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
              {projects.map((project) => (
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
              {inspectors.map((inspector) => (
                <SelectItem key={inspector.id} value={inspector.id}>
                  {`${inspector.name} ${inspector.surname}`}
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
            numberOfMonths={2}
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