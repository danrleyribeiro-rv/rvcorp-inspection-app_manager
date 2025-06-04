// src/app/(dashboard)/reports/components/InspectionReportCard.js
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileText,
  Download,
  Eye,
  AlertTriangle,
  Package,
  ChevronDown,
  ChevronRight,
  Calendar
} from "lucide-react";

export default function InspectionReportCard({ inspection, onView, onGeneratePreview }) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yy", { locale: ptBR });
    } catch {
      return "N/A";
    }
  };

  const getNonConformitiesCount = () => {
    if (!inspection.topics) return 0;
    
    let count = 0;
    inspection.topics.forEach(topic => {
      if (topic.items) {
        topic.items.forEach(item => {
          if (item.details) {
            item.details.forEach(detail => {
              if (detail.non_conformities) {
                count += detail.non_conformities.length;
              }
            });
          }
        });
      }
    });
    return count;
  };

  const nonConformitiesCount = getNonConformitiesCount();
  const hasReleases = inspection.releases && inspection.releases.length > 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader 
        className="cursor-pointer py-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {expanded ? 
              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : 
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            }
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                {inspection.cod && (
                  <span className="font-mono text-xs bg-blue-100 px-1.5 py-0.5 rounded">
                    {inspection.cod}
                  </span>
                )}
                <h3 className="font-medium text-sm truncate">{inspection.title}</h3>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="truncate">{inspection.project?.title}</span>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(inspection.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="flex items-center gap-1 mr-2">
              <Progress value={inspection.completion} className="w-12 h-1.5" />
              <span className="text-xs font-medium w-8 text-right">
                {inspection.completion}%
              </span>
            </div>
            
            {nonConformitiesCount > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0">
                {nonConformitiesCount} NC
              </Badge>
            )}

            {hasReleases && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {inspection.releases.length}R
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Releases Resumidos */}
            <div>
              <h4 className="font-medium text-sm mb-2">Releases</h4>
                {hasReleases ? (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                    {inspection.releases.slice(0, 3).map((release, index) => (
                    <div key={release.id} className="flex items-center justify-between text-xs border rounded p-1.5">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1">
                            <span className="font-mono text-xs">
                                RLT{(index + 1).toString().padStart(2, '0')}-{inspection.cod}
                            </span>
                            {release.is_delivered && (
                                <Badge variant="default" className="text-xs px-1 py-0">
                                Entregue
                                </Badge>
                            )}
                            </div>
                            {release.release_notes && (
                            <span className="text-xs text-muted-foreground truncate">
                                {release.release_notes}
                            </span>
                            )}
                        </div>
                        </div>
                        <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs flex-shrink-0"
                        onClick={() => onGeneratePreview(inspection, release)}
                        >
                        <Download className="h-3 w-3 mr-1" />
                        PDF
                        </Button>
                    </div>
                    ))}
                    {inspection.releases.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                        +{inspection.releases.length - 3} mais...
                    </p>
                    )}
                </div>
                ) : (
                <p className="text-xs text-muted-foreground">
                    Nenhum release criado
                </p>
                )}
            </div>

            {/* Estatísticas */}
            <div>
              <h4 className="font-medium text-sm mb-2">Estatísticas</h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="font-medium">{inspection.topics?.length || 0}</div>
                  <div className="text-muted-foreground">Tópicos</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">
                    {inspection.topics?.reduce((acc, topic) => 
                      acc + (topic.items?.length || 0), 0
                    ) || 0}
                  </div>
                  <div className="text-muted-foreground">Itens</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">{nonConformitiesCount}</div>
                  <div className="text-muted-foreground">NCs</div>
                </div>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onView}>
              <Eye className="mr-1 h-3 w-3" />
              Ver
            </Button>
            <Button size="sm" onClick={() => onGeneratePreview(inspection)}>
              <Download className="mr-1 h-3 w-3" />
              Preview PDF
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}