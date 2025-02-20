// src/app/(dashboard)/projects/components/KanbanView.js
"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const columns = {
  pendente: { title: "Pendente", color: "bg-gray-100" },
  em_andamento: { title: "Em Andamento", color: "bg-yellow-100" },
  concluido: { title: "Concluído", color: "bg-green-100" },
  atrasado: { title: "Atrasado", color: "bg-red-100" }
};

export default function KanbanView() {
  const [projects, setProjects] = useState({});

  useEffect(() => {
    const q = query(collection(db, "projects"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.reduce((acc, doc) => {
        const data = { id: doc.id, ...doc.data() };
        const status = data.status || "pendente";
        if (!acc[status]) acc[status] = [];
        acc[status].push(data);
        return acc;
      }, {});
      setProjects(projectsData);
    });
    return () => unsubscribe();
  }, []);

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const { draggableId, source, destination } = result;

    if (source.droppableId !== destination.droppableId) {
      await updateDoc(doc(db, "projects", draggableId), {
        status: destination.droppableId
      });
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(columns).map(([columnId, column]) => (
          <div key={columnId} className={`${column.color} rounded-lg p-4`}>
            <h3 className="font-semibold mb-4">{column.title}</h3>
            <Droppable droppableId={columnId}>
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {(projects[columnId] || []).map((project, index) => (
                    <Draggable
                      key={project.id}
                      draggableId={project.id}
                      index={index}
                    >
                      {(provided) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="bg-white"
                        >
                          <CardHeader>
                            <CardTitle className="text-sm">{project.title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              {project.clientName}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
