// src/components/ui/loading.jsx
"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Spinner básico
export function Spinner({ className, size = "default" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6", 
    lg: "h-8 w-8",
    xl: "h-12 w-12"
  };

  return (
    <Loader2 
      className={cn(
        "animate-spin text-primary",
        sizeClasses[size],
        className
      )} 
    />
  );
}

// Loading de tela inteira
export function FullScreenLoading({ message = "Carregando..." }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 p-8 bg-background rounded-lg border shadow-lg">
        <Spinner size="xl" />
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      </div>
    </div>
  );
}

// Loading de página
export function PageLoading({ message = "Carregando..." }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      </div>
    </div>
  );
}

// Loading de seção
export function SectionLoading({ message = "Carregando...", className }) {
  return (
    <div className={cn("flex items-center justify-center py-8", className)}>
      <div className="flex flex-col items-center gap-3">
        <Spinner />
        <p className="text-xs text-muted-foreground animate-pulse">{message}</p>
      </div>
    </div>
  );
}

// Loading inline
export function InlineLoading({ message, className }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Spinner size="sm" />
      {message && <span className="text-sm text-muted-foreground">{message}</span>}
    </div>
  );
}

// Loading de navegação (barra no topo)
export function NavigationLoading() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-background">
      <div className="h-full bg-primary animate-pulse" 
           style={{
             animation: 'loading-bar 2s infinite ease-in-out',
           }}
      />
      <style jsx>{`
        @keyframes loading-bar {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 75%; margin-left: 12.5%; }
          100% { width: 100%; margin-left: 0%; }
        }
      `}</style>
    </div>
  );
}

// Loading overlay para botões
export function ButtonLoading({ children, loading, disabled, ...props }) {
  return (
    <button 
      disabled={disabled || loading}
      className={cn(
        "relative overflow-hidden transition-all duration-200",
        loading && "cursor-not-allowed",
        props.className
      )}
      {...props}
    >
      <span className={cn(
        "flex items-center gap-2 transition-opacity duration-200",
        loading && "opacity-0"
      )}>
        {children}
      </span>
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner size="sm" />
        </div>
      )}
    </button>
  );
}

// Skeleton customizável
export function LoadingSkeleton({ className, animate = true }) {
  return (
    <div 
      className={cn(
        "bg-muted rounded-md",
        animate && "animate-pulse",
        className
      )} 
    />
  );
}

// Grid de loading skeletons
export function SkeletonGrid({ items = 6, className }) {
  return (
    <div className={cn("grid gap-4", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="space-y-3">
          <LoadingSkeleton className="h-4 w-3/4" />
          <LoadingSkeleton className="h-4 w-1/2" />
          <LoadingSkeleton className="h-20 w-full" />
        </div>
      ))}
    </div>
  );
}