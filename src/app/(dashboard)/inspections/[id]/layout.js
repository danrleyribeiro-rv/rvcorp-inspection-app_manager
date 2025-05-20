// app/(dashboard)/inspections/[id]/layout.js
"use client";

export default function InspectionLayout({ children }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}