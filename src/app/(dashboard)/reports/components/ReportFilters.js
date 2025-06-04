// src/app/(dashboard)/reports/components/ReportFilters.js
"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function ReportFilters({ filters, onFiltersChange, inspections }) {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    // Extrair projetos únicos das inspeções
    const uniqueProjects = inspections.reduce((acc, inspection) => {
      if (inspection.project && !acc.find(p => p.id === inspection.project.id)) {
        acc.push(inspection.project);
      }
      return acc;
    }, []);
    setProjects(uniqueProjects);
  }, [inspections]);

  const handleReset = () => {
    onFiltersChange({
      status: "all",
      completion: "all",
      project: "all",
      dateRange: null
    });
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>Filtros de Relatórios</SheetTitle>
      </SheetHeader>
      
      <div className="space-y-6 pt-6">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
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
          <Label>Completude</Label>
          <Select
            value={filters.completion}
            onValueChange={(value) => onFiltersChange({ ...filters, completion: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="complete">Completas (100%)</SelectItem>
              <SelectItem value="incomplete">Incompletas (&lt;100%)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Projeto</Label>
          <Select
            value={filters.project}
            onValueChange={(value) => onFiltersChange({ ...filters, project: value })}
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
          <Label>Período</Label>
          <Calendar
            mode="range"
            selected={filters.dateRange}
            onSelect={(range) => onFiltersChange({ ...filters, dateRange: range })}
            numberOfMonths={1}
            className="rounded-md border"
          />
        </div>

        <Button onClick={handleReset} variant="outline" className="w-full">
          Limpar Filtros
        </Button>
      </div>
    </>
  );
}