// src/components/ui/responsive-container.jsx
"use client";

import { cn } from "@/lib/utils";

export function ResponsiveContainer({ children, className, padding = true }) {
  return (
    <div className={cn(
      "w-full mx-auto",
      padding && "px-4 sm:px-6 lg:px-8",
      "max-w-7xl", // Largura máxima para telas grandes
      className
    )}>
      {children}
    </div>
  );
}

export function ResponsiveGrid({ children, className, cols = { sm: 1, md: 2, lg: 3, xl: 4 } }) {
  const gridCols = `grid-cols-${cols.sm} sm:grid-cols-${cols.sm} md:grid-cols-${cols.md} lg:grid-cols-${cols.lg} xl:grid-cols-${cols.xl}`;
  
  return (
    <div className={cn(
      "grid gap-4 w-full",
      `grid-cols-1 sm:grid-cols-${cols.sm} md:grid-cols-${cols.md} lg:grid-cols-${cols.lg} xl:grid-cols-${cols.xl}`,
      className
    )}>
      {children}
    </div>
  );
}

export function ResponsiveStack({ children, className, spacing = "space-y-4" }) {
  return (
    <div className={cn(
      "flex flex-col w-full",
      spacing,
      className
    )}>
      {children}
    </div>
  );
}

export function ResponsiveFlex({ children, className, direction = "row", wrap = true, gap = "gap-4" }) {
  const flexDirection = {
    row: "flex-row",
    "row-reverse": "flex-row-reverse", 
    col: "flex-col",
    "col-reverse": "flex-col-reverse"
  };

  return (
    <div className={cn(
      "flex w-full",
      flexDirection[direction],
      wrap && "flex-wrap",
      gap,
      className
    )}>
      {children}
    </div>
  );
}