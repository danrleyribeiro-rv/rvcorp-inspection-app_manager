// src/app/(dashboard)/templates/page.js
"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Upload, Download, Search, Edit } from "lucide-react"; // Keep Edit if used, or remove
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
import { useRouter } from "next/navigation"; // Added for navigation
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
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const router = useRouter(); // Initialize router

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

  const handleEditTemplate = (template) => {
    router.push(`/templates/${template.id}/editor`);
  };

  return (
    <div className="container p-6 mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Templates</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <Button onClick={() => router.push('/templates/new/editor')} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Novo Template
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImport(true)} className="flex-1 sm:flex-none">
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </Button>
            <Button variant="outline" onClick={() => setShowExport(true)} className="flex-1 sm:flex-none">
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
            : "Nenhum template corresponde à sua busca."
          }
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
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
                        <span className="font-mono text-xs sm:text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {template.cod}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium max-w-[150px] sm:max-w-xs truncate">{template.title}</TableCell>
                    <TableCell className="max-w-[150px] sm:max-w-xs truncate text-sm text-muted-foreground">
                      {template.description || 'Sem descrição'}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs sm:text-sm space-y-0.5">
                        <div>
                          <span className="font-medium text-foreground">{topicsCount}</span> Tópico{topicsCount !== 1 ? 's' : ''}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{itemsCount}</span> Ite{itemsCount !== 1 ? 'ns' : 'm'}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{detailsCount}</span> Detalhe{detailsCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(template.template_price)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTemplate(template)} // Updated action
                        >
                          <Edit className="h-4 w-4 mr-1 sm:mr-2" />
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

      {/* Statistics cards have been removed */}


      {/* TemplateEditDialog is no longer used here */}

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
          templates={filteredTemplates} // You might want to pass all templates or let ExportDialog fetch them
        />
      )}
    </div>
  );
}