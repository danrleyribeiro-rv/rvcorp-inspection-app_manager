// src/components/inspection/InspectionUpdateIndicator.jsx
"use client";

import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  GitPullRequest, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  Database 
} from "lucide-react";
import { useInspectionVersioning } from "@/hooks/use-inspection-versioning";
import InspectionPreviewModal from "./InspectionPreviewModal";

/**
 * Componente para mostrar indicador de atualizações disponíveis em listas de inspeções
 */
export default function InspectionUpdateIndicator({ 
  inspectionId, 
  compact = false,
  onUpdateCompleted 
}) {
  const [showPreview, setShowPreview] = useState(false);
  
  const {
    changeInfo,
    checkingChanges,
    status,
    hasUpdatesAvailable,
    checkForChanges,
    currentVersionNumber
  } = useInspectionVersioning(inspectionId);

  const getIndicatorProps = () => {
    switch (status) {
      case 'checking':
        return {
          variant: 'secondary',
          text: 'Verificando...',
          icon: RefreshCw,
          className: 'animate-spin',
          color: 'text-muted-foreground'
        };
      
      case 'first-pull':
        return {
          variant: 'default',
          text: compact ? 'Nova' : 'Primeira importação',
          icon: Database,
          className: '',
          color: 'text-primary'
        };
      
      case 'has-changes':
        return {
          variant: 'destructive',
          text: compact ? 'Atualizar' : 'Atualizações disponíveis',
          icon: AlertTriangle,
          className: 'animate-pulse',
          color: 'text-destructive'
        };
      
      case 'up-to-date':
        return {
          variant: 'secondary',
          text: compact ? `v${currentVersionNumber}` : 'Sincronizado',
          icon: CheckCircle,
          className: '',
          color: 'text-green-600'
        };
      
      case 'error':
        return {
          variant: 'destructive',
          text: 'Erro',
          icon: AlertTriangle,
          className: '',
          color: 'text-destructive'
        };
      
      default:
        return {
          variant: 'outline',
          text: 'Desconhecido',
          icon: GitPullRequest,
          className: '',
          color: 'text-muted-foreground'
        };
    }
  };

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (hasUpdatesAvailable) {
      setShowPreview(true);
    } else {
      checkForChanges();
    }
  };

  const handleUpdateCompleted = () => {
    onUpdateCompleted?.();
  };

  const indicatorProps = getIndicatorProps();
  const IconComponent = indicatorProps.icon;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClick}
              className={`h-6 px-2 ${indicatorProps.color}`}
            >
              <IconComponent className={`h-3 w-3 ${indicatorProps.className}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <div className="font-medium">{indicatorProps.text}</div>
              {status === 'has-changes' && changeInfo?.originalLastUpdated && (
                <div className="text-xs text-muted-foreground">
                  Atualizada em {new Date(changeInfo.originalLastUpdated).toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
        
        <InspectionPreviewModal
          open={showPreview}
          onClose={() => setShowPreview(false)}
          inspectionId={inspectionId}
          onPullConfirmed={handleUpdateCompleted}
        />
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={indicatorProps.variant}
        className="cursor-pointer"
        onClick={handleClick}
      >
        <IconComponent className={`h-3 w-3 mr-1 ${indicatorProps.className}`} />
        {indicatorProps.text}
      </Badge>
      
      {hasUpdatesAvailable && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          className="h-6 px-2"
        >
          <GitPullRequest className="h-3 w-3 mr-1" />
          {status === 'first-pull' ? 'Importar' : 'Atualizar'}
        </Button>
      )}
      
      <InspectionPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        inspectionId={inspectionId}
        onPullConfirmed={handleUpdateCompleted}
      />
    </div>
  );
}