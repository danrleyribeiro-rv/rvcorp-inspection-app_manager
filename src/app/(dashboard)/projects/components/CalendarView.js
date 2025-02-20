// src/app/(dashboard)/projects/components/CalendarView.js
"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Calendar } from "@/components/ui/calendar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CalendarView() {
  const [projects, setProjects] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const q = query(collection(db, "projects"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        inspectionDate: doc.data().inspectionDate ? parseISO(doc.data().inspectionDate) : null
      }));
      setProjects(projectsData);
    });
    return () => unsubscribe();
  }, []);

  const getDayContent = (day) => {
    const dayProjects = projects.filter(project => {
      if (!project.inspectionDate || !isValid(project.inspectionDate)) return false;
      return format(project.inspectionDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
    });

    if (dayProjects.length === 0) return null;

    return (
      <HoverCard>
        <HoverCardTrigger>
          <div className="w-full h-full flex items-center justify-center">
            <div className="h-2 w-2 bg-primary rounded-full" />
          </div>
        </HoverCardTrigger>
        <HoverCardContent>
          <div className="space-y-2">
            {dayProjects.map(project => (
              <div key={project.id}>
                <p className="font-semibold">{project.title}</p>
                <p className="text-sm text-muted-foreground">
                  Cliente: {project.clientName}
                </p>
                <p className="text-sm text-muted-foreground">
                  Vistoriador: {project.inspectorName}
                </p>
              </div>
            ))}
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  };

  return (
    <div className="p-4 bg-white rounded-lg">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        locale={ptBR}
        components={{
          DayContent: ({ day }) => getDayContent(day)
        }}
      />
    </div>
  );
}