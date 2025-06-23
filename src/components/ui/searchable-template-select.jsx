// src/components/ui/searchable-template-select.jsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, X } from "lucide-react";

export default function SearchableTemplateSelect({ 
  templates = [], 
  value, 
  onValueChange, 
  placeholder = "Selecione um template",
  required = false 
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    if (value) {
      const template = templates.find(t => t.id === value);
      setSelectedTemplate(template);
    } else {
      setSelectedTemplate(null);
    }
  }, [value, templates]);

  const filteredTemplates = templates.filter(template =>
    template.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.cod?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (template) => {
    onValueChange(template.id);
    setOpen(false);
    setSearchTerm("");
  };

  const handleClear = () => {
    onValueChange(null);
    setSelectedTemplate(null);
  };

  const getTopicsAndItemsCount = (template) => {
    const topicsCount = template.topics?.length || 0;
    const itemsCount = template.topics?.reduce((total, topic) => 
      total + (topic.items?.length || 0), 0
    ) || 0;
    return { topicsCount, itemsCount };
  };

  return (
    <div className="w-full">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal h-auto min-h-[2.5rem] p-3"
          >
            {selectedTemplate ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">{selectedTemplate.title}</span>
                    {selectedTemplate.cod && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedTemplate.cod}
                      </Badge>
                    )}
                  </div>
                  {selectedTemplate.description && (
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {selectedTemplate.description}
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Search className="h-4 w-4" />
                <span>{placeholder}</span>
              </div>
            )}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Selecionar Template</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
            
            <div className="max-h-[50vh] overflow-y-auto space-y-2">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "Nenhum template encontrado" : "Nenhum template disponível"}
                </div>
              ) : (
                filteredTemplates.map((template) => {
                  const { topicsCount, itemsCount } = getTopicsAndItemsCount(template);
                  
                  return (
                    <Card 
                      key={template.id} 
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => handleSelect(template)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              <span className="font-medium truncate">{template.title}</span>
                            </div>
                            {template.cod && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                {template.cod}
                              </Badge>
                            )}
                          </div>
                          
                          {template.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {template.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Tópicos: {topicsCount}</span>
                            <span>Itens: {itemsCount}</span>
                            {template.price && (
                              <span>Preço: R$ {template.price}</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
            
            {!required && (
              <div className="border-t pt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    onValueChange(null);
                    setOpen(false);
                    setSearchTerm("");
                  }}
                >
                  Nenhum Template
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}