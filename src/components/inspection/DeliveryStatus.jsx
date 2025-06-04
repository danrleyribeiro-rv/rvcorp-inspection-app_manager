"use client";

import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle, Clock } from "lucide-react";
import { formatDateSafe } from "@/utils/dateFormater";

export default function DeliveryStatus({ inspection }) {
  if (!inspection.delivered) {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Não Entregue
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Entregue
      </Badge>
      {inspection.delivered_at && (
        <span className="text-xs text-muted-foreground">
          em {formatDateSafe(inspection.delivered_at)}
        </span>
      )}
    </div>
  );
}
