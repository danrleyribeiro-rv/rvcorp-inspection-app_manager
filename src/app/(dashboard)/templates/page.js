// src/app/(dashboard)/templates/page.js
"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PencilRuler,
  Ruler,
  Wrench,
  Puzzle,
  Home,
  Building,
  Store,
} from "lucide-react";
import TemplateCreation from "./components/TemplateCreation";
import TemplateEdit from "./components/TemplateEdit";
import ImportTemplateDialog from "./components/ImportTemplateDialog";

const iconComponents = {
  'pencil-ruler': PencilRuler,
  'ruler': Ruler,
  'wrench': Wrench,
  'puzzle': Puzzle,
  'house': Home,
  'building': Building,
  'store': Store,
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "templates"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const templatesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTemplates(templatesData);
    });
    return () => unsubscribe();
  }, []);

  const getIconComponent = (iconName) => {
    const IconComponent = iconComponents[iconName];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : null;
  };

  return (
    <div className="container p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Templates</h1>
        <div className="flex gap-4">
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Template
          </Button>
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar Template
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Salas</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell>
                  <div className={template.iconColor || 'text-gray-700'}>
                    {getIconComponent(template.icon)}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{template.title}</TableCell>
                <TableCell>{template.description}</TableCell>
                <TableCell>{template.rooms?.length || 0}</TableCell>
                <TableCell>
                  {template.rooms?.reduce((acc, room) => acc + (room.items?.length || 0), 0) || 0}
                </TableCell>
                <TableCell>
                  R$ {(Number(template.template_price) || 0).toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {showCreate && (
        <TemplateCreation 
          onClose={() => setShowCreate(false)} 
          open={showCreate}
        />
      )}

      {selectedTemplate && (
        <TemplateEdit
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          open={!!selectedTemplate}
        />
      )}

      {showImport && (
        <ImportTemplateDialog
          onClose={() => setShowImport(false)}
          open={showImport}
        />
      )}
    </div>
  );
}