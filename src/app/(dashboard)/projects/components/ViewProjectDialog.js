
// components/projects/components/ViewProjectDialog.js
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  CalendarIcon,
  FileIcon,
  UserIcon,
  TagIcon,
  DollarSignIcon,
  ClockIcon
} from "lucide-react"

const statusColors = {
  "Aguardando": "yellow",
  "Em Andamento": "blue",
  "Em Revisão": "purple",
  "Concluído": "green"
}

export default function ViewProjectDialog({ project, open, onClose }) {
  const [clientDetails, setClientDetails] = useState(null)
  const [inspections, setInspections] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (project?.client_id) {
      fetchClientDetails()
      fetchInspections()
    }
  }, [project])

  const fetchClientDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('name, email, phonenumber, responsible_name, responsible_surname')
        .eq('id', project.client_id)
        .single();
      
      if (error) throw error;
      setClientDetails(data);
    } catch (error) {
      console.error("Error fetching client details:", error);
    }
  }

  const fetchInspections = async () => {
    try {
      const { data, error } = await supabase
        .from('inspections')
        .select('id, title, status, scheduled_date')
        .eq('project_id', project.id)
        .is('deleted_at', null)
        .order('scheduled_date', { ascending: false });
      
      if (error) throw error;
      setInspections(data || []);
    } catch (error) {
      console.error("Error fetching inspections:", error);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{project.title}</span>
            <Badge variant={statusColors[project.status]}>{project.status}</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalhes do Projeto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2">
                <FileIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Descrição</p>
                  <p className="text-sm text-muted-foreground">{project.description || "Sem descrição"}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <TagIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Tipo</p>
                  <p className="text-sm text-muted-foreground">{project.type || "Não especificado"}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Valor</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(project.project_price)}</p>
                </div>
              </div>
              
              {project.inspection_date && (
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Data da Inspeção</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(project.inspection_date), "PPP", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Criado em</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(project.created_at), "PPP", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {clientDetails ? (
                <>
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Nome</p>
                      <p className="text-sm text-muted-foreground">{clientDetails.name}</p>
                    </div>
                  </div>
                  
                  {(clientDetails.responsible_name || clientDetails.responsible_surname) && (
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Responsável</p>
                        <p className="text-sm text-muted-foreground">
                          {`${clientDetails.responsible_name || ''} ${clientDetails.responsible_surname || ''}`}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    <div>
                      <p className="font-medium">Telefone</p>
                      <p className="text-sm text-muted-foreground">{clientDetails.phonenumber || "Não informado"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{clientDetails.email || "Não informado"}</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Carregando informações do cliente...</p>
              )}
            </CardContent>
          </Card>
        </div>
        
        <Separator className="my-4" />
        
        <div>
          <h3 className="text-lg font-medium mb-4">Inspeções</h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando inspeções...</p>
          ) : inspections.length > 0 ? (
            <div className="space-y-2">
              {inspections.map((inspection) => (
                <div key={inspection.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">{inspection.title}</p>
                    {inspection.scheduled_date && (
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(inspection.scheduled_date), "PPP", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                  <Badge>{inspection.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma inspeção encontrada para este projeto.</p>
          )}
        </div>
        
        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}