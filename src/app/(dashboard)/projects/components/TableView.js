// src/app/(dashboard)/projects/components/TableView.js
"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const getStatusColor = (status) => {
  const statusColors = {
    "em_andamento": "yellow",
    "concluido": "green",
    "pendente": "gray",
    "atrasado": "red"
  };
  return statusColors[status] || "gray";
};

export default function TableView() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "projects"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectsData);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Vistoriador</TableHead>
            <TableHead>Data da Vistoria</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id}>
              <TableCell>{project.title}</TableCell>
              <TableCell>{project.clientName}</TableCell>
              <TableCell>
                <Badge variant={getStatusColor(project.status)}>
                  {project.status.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell>{project.inspectorName}</TableCell>
              <TableCell>
                {project.inspectionDate ? 
                  format(new Date(project.inspectionDate), "PPP", { locale: ptBR }) 
                  : "Não agendada"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}