
// components/projects/components/CalendarView.js
"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Edit, Eye, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import EditProjectDialog from "./EditProjectDialog";
import DeleteProjectDialog from "./DeleteProjectDialog";
import ViewProjectDialog from "./ViewProjectDialog";

export default function CalendarView({ projects, isLoading, onRefresh }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingProject, setEditingProject] = useState(null);
  const [deletingProject, setDeletingProject] = useState(null);
  const [viewingProject, setViewingProject] = useState(null);

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  const getDayContent = (day) => {
    // Filter projects with inspection date on this day
    const dayProjects = projects.filter(project => {
      if (!project.inspection_date || !isValid(new Date(project.inspection_date))) return false;
      return format(new Date(project.inspection_date), "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
    });

    if (dayProjects.length === 0) return null;

    return (
      <HoverCard>
        <HoverCardTrigger>
          <div className="flex justify-center items-center w-full h-full">
            <div className={`h-2 w-2 bg-blue-500 rounded-full ${dayProjects.length > 1 ? "after:content-[''] after:absolute after:h-2 after:w-2 after:bg-blue-500 after:rounded-full after:translate-x-1" : ""}`} />
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">
              {format(day, "PPPP", { locale: ptBR })}
            </h4>
            <div className="space-y-1">
              {dayProjects.map(project => (
                <div key={project.id} className="p-2 text-xs rounded border flex justify-between items-center">
                  <div>
                    <p className="font-medium">{project.title}</p>
                    <p className="text-muted-foreground">
                      Cliente: {project.clients?.name || 'N/A'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={() => setViewingProject(project)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={() => setEditingProject(project)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={() => setDeletingProject(project)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  };

  return (
    <>
      <div className="p-4 bg-white rounded-lg border">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          locale={ptBR}
          components={{
            DayContent: ({ day }) => (
              <div className="relative flex items-center justify-center w-8 h-8">
                <span>{format(day, "d")}</span>
                <div className="absolute -bottom-1">
                  {getDayContent(day)}
                </div>
              </div>
            )
          }}
          className="rounded-md mx-auto max-w-4xl"
        />
      </div>

      {editingProject && (
        <EditProjectDialog
          project={editingProject}
          open={!!editingProject}
          onClose={() => setEditingProject(null)}
          onSuccess={onRefresh}
        />
      )}

      {deletingProject && (
        <DeleteProjectDialog
          project={deletingProject}
          open={!!deletingProject}
          onClose={() => setDeletingProject(null)}
          onSuccess={onRefresh}
        />
      )}

      {viewingProject && (
        <ViewProjectDialog
          project={viewingProject}
          open={!!viewingProject}
          onClose={() => setViewingProject(null)}
        />
      )}
    </>
  );
}