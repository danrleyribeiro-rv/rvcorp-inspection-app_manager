// src/components/ui/top-progress-bar.js
"use client";

import React from 'react';
import { Progress } from "@/components/ui/progress";
import { useLoading } from '@/context/loading-context';

export function TopProgressBar() {
  const { progress, isVisible } = useLoading();

  // If progress is null, it's fully hidden and reset.
  if (progress === null) {
    return null;
  }

  const barStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    height: '3px', // Adjust height as desired
    transition: 'opacity 0.3s ease-out',
    opacity: isVisible ? 1 : 0, // Controls fade-in/out
  };

  return (
    <div style={barStyle}>
      {/* The Progress component's root should have h-full and rounded-none if height is set here */}
      <Progress value={progress} className="w-full h-full rounded-none" />
    </div>
  );
}