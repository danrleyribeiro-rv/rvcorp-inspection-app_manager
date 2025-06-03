// src/app/(dashboard)/templates/page.js
"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Upload, Download, Search } from "lucide-react";
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
import { parseCode } from "@/utils/codeGenerator";
import TemplateCreationDialog from "./components/TemplateCreationDialog";
import TemplateEditDialog from "./components/TemplateEditDialog";
import ImportTemplateDialog from "./components/ImportTemplateDialog";
import ExportTemplateDialog from "./components/ExportTemplateDialog";
import DeleteTemplateDialog from "./components/DeleteTemplateDialog";

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
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    // Filter templates based on search term
    if (searchTerm.trim() === "") {
      setFilteredTemplates(templates);
    } else {
      const filtered = templates.filter(template => 
        template.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.cod?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTemplates(filtered);
    }
  }, [templates, searchTerm]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      // Create query to get all non-deleted templates, ordered by code
      const templatesQuery = query(
        collection(db, 'templates'),
        where('deleted_at', '==', null),
        orderBy('cod', 'asc')
      );
      
      const querySnapshot = await getDocs(templatesQuery);
      
      // Map documents to our data structure, formatting timestamps
      const templatesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate().toISOString(),
          updated_at: data.updated_at?.toDate().toISOString(),
          parsedCode: data.cod ? parseCode(data.cod) : null
        };
      });
      
      setTemplates(templatesData || []);
    } catch (error) {
      console.error("Erro ao carregar templates:", error);
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

  const getTemplateStats = (template) => {
    const topicsCount = template.topics?.length || 0;
    const itemsCount = template.topics?.reduce((acc, topic) => 
      acc + (topic.items?.length || 0), 0) || 0;
    const detailsCount = template.topics?.reduce((acc, topic) => 
      acc + (topic.items?.reduce((itemAcc, item) => 
        itemAcc + (item.details?.length || 0), 0) || 0), 0) || 0;
    
    return { topicsCount, itemsCount, detailsCount };
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

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, descrição ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {templates.length === 0 
            ? "Nenhum template encontrado. Crie um novo template para começar."
            : "Nenhum template corresponde aos filtros aplicados."
          }
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Estrutura</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((template) => {
                const { topicsCount, itemsCount, detailsCount } = getTemplateStats(template);
                
                return (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className={template.icon_color || 'text-gray-700'}>
                        {getIconComponent(template.icon)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {template.cod ? (
                        <span className="font-mono text-sm bg-blue-100 px-2 py-1 rounded">
                          {template.cod}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{template.title}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {template.description || 'Sem descrição'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">
                            <span className="font-medium">{topicsCount}</span> tópico{topicsCount !== 1 ? 's' : ''}
                          </span>
                          <span className="text-muted-foreground">
                            <span className="font-medium">{itemsCount}</span> ite{itemsCount !== 1 ? 'ns' : 'm'}
                          </span>
                          <span className="text-muted-foreground">
                            <span className="font-medium">{detailsCount}</span> detalhe{detailsCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatCurrency(template.template_price)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTemplate(template)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive/90"
                          onClick={() => setTemplateToDelete(template)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
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

      {templateToDelete && (
        <DeleteTemplateDialog
          template={templateToDelete}
          open={!!templateToDelete}
          onClose={() => setTemplateToDelete(null)}
          onDelete={fetchTemplates}
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
          templates={filteredTemplates}
        />
      )}
    </div>
  );
}