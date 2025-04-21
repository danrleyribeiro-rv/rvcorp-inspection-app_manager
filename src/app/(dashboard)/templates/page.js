// app/(dashboard)/templates/page.js
"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Download } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import TemplateCreationDialog from "./components/TemplateCreationDialog";
import TemplateEditDialog from "./components/TemplateEditDialog";
import ImportTemplateDialog from "./components/ImportTemplateDialog";
import ExportTemplateDialog from "./components/ExportTemplateDialog";

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
  const [showExport, setShowExport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      // Create query to get all non-deleted templates
      const templatesQuery = query(
        collection(db, 'templates'),
        where('deleted_at', '==', null),
        orderBy('title')
      );
      
      const querySnapshot = await getDocs(templatesQuery);
      
      // Map docs to our data structure, formatting timestamps
      const templatesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate().toISOString(),
          updated_at: data.updated_at?.toDate().toISOString()
        };
      });
      
      setTemplates(templatesData || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Erro ao carregar templates",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getIconComponent = (iconName) => {
    const IconComponent = iconComponents[iconName];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : null;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </Button>
            <Button variant="outline" onClick={() => setShowExport(true)}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum template encontrado. Crie um novo template para começar.
        </div>
      ) : (
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
                    <div className={template.icon_color || 'text-gray-700'}>
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
                    {formatCurrency(template.template_price)}
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
      )}

      {showCreate && (
        <TemplateCreationDialog 
          onClose={() => setShowCreate(false)} 
          open={showCreate}
          onSuccess={fetchTemplates}
        />
      )}

      {selectedTemplate && (
        <TemplateEditDialog
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          open={!!selectedTemplate}
          onSuccess={fetchTemplates}
        />
      )}
      {showImport && (
        <ImportTemplateDialog
          onClose={() => setShowImport(false)}
          open={showImport}
          onSuccess={fetchTemplates}
        />
      )}

      {showExport && (
        <ExportTemplateDialog
          onClose={() => setShowExport(false)}
          open={showExport}
          templates={templates}
        />
      )}
    </div>
  );
}