// src/components/ui/searchable-inspector-select.jsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, User, X, MapPin, Hash } from "lucide-react";

export default function SearchableInspectorSelect({ 
  inspectors = [], 
  value, 
  onValueChange, 
  placeholder = "Selecione um inspetor",
  required = false 
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInspector, setSelectedInspector] = useState(null);

  useEffect(() => {
    if (value) {
      const inspector = inspectors.find(i => i.id === value);
      setSelectedInspector(inspector);
    } else {
      setSelectedInspector(null);
    }
  }, [value, inspectors]);

  const filteredInspectors = inspectors.filter(inspector => {
    const fullName = `${inspector.name || ''} ${inspector.last_name || ''}`.trim().toLowerCase();
    const search = searchTerm.toLowerCase();
    
    return (
      fullName.includes(search) ||
      inspector.email?.toLowerCase().includes(search) ||
      inspector.city?.toLowerCase().includes(search) ||
      inspector.state?.toLowerCase().includes(search) ||
      inspector.id?.toLowerCase().includes(search)
    );
  });

  const handleSelect = (inspector) => {
    onValueChange(inspector.id);
    setOpen(false);
    setSearchTerm("");
  };

  const handleClear = () => {
    onValueChange(null);
    setSelectedInspector(null);
  };

  const getInitials = (inspector) => {
    const firstName = inspector.name || '';
    const lastName = inspector.last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getLocation = (inspector) => {
    const parts = [];
    if (inspector.city) parts.push(inspector.city);
    if (inspector.state) parts.push(inspector.state);
    return parts.join(', ');
  };

  return (
    <div className="w-full">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal h-auto min-h-[2.5rem] p-3"
          >
            {selectedInspector ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedInspector.profile_image} />
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                      {getInitials(selectedInspector)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium">
                      {`${selectedInspector.name || ''} ${selectedInspector.last_name || ''}`.trim()}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {getLocation(selectedInspector) && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{getLocation(selectedInspector)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        <span>{selectedInspector.id?.slice(-8)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground rounded-sm flex items-center justify-center cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                >
                  <X className="h-3 w-3" />
                </div>
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
            <DialogTitle>Selecionar Inspetor</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, email, cidade ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
            
            <div className="max-h-[50vh] overflow-y-auto space-y-2">
              {filteredInspectors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "Nenhum inspetor encontrado" : "Nenhum inspetor disponível"}
                </div>
              ) : (
                filteredInspectors.map((inspector) => (
                  <Card 
                    key={inspector.id} 
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSelect(inspector)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={inspector.profile_image} />
                          <AvatarFallback className="bg-blue-100 text-blue-700">
                            {getInitials(inspector)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">
                              {`${inspector.name || ''} ${inspector.last_name || ''}`.trim()}
                            </span>
                            {inspector.is_verified && (
                              <Badge variant="default" className="text-xs">
                                Verificado
                              </Badge>
                            )}
                          </div>
                          
                          {inspector.email && (
                            <p className="text-sm text-muted-foreground truncate mb-1">
                              {inspector.email}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {getLocation(inspector) && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{getLocation(inspector)}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              <span>ID: {inspector.id?.slice(-8)}</span>
                            </div>
                            {inspector.phone && (
                              <span>{inspector.phone}</span>
                            )}
                          </div>
                          
                          {inspector.specializations && inspector.specializations.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {inspector.specializations.slice(0, 3).map((spec, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {spec}
                                </Badge>
                              ))}
                              {inspector.specializations.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{inspector.specializations.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
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
                  Nenhum Inspetor
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}