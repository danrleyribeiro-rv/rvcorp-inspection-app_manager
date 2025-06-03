// src/context/loading-context.js
"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

const LoadingContext = createContext(undefined);

export const LoadingProvider = ({ children }) => {
  const [progress, setProgress] = useState(null); // null, or 0-100
  const [isVisible, setIsVisible] = useState(false);

  const startLoading = useCallback(() => {
    setProgress(0);
    setIsVisible(true);
    // Short delay to ensure bar renders at 0 then jumps to a small perceptible value
    requestAnimationFrame(() => {
      setTimeout(() => {
        setProgress(prev => (prev !== null ? Math.max(10, prev) : 10));
      }, 10);
    });
  }, []);

  const updateProgress = useCallback((value) => {
    if (isVisible || progress !== null) { // Allow update even if just becoming visible
      setProgress(prev => {
        if (prev === null) return value;
        return Math.min(100, Math.max(prev, value)); // Cap at 100, ensure it increases
      });
    } else { // If called when not visible, start it
      setProgress(0);
      setIsVisible(true);
      requestAnimationFrame(() => {
        setTimeout(() => setProgress(Math.min(100, value)), 10);
      });
    }
  }, [isVisible, progress]);

  const finishLoading = useCallback(() => {
    if (isVisible || progress !== null) {
      setIsVisible(true); // Ensure visible for the 100% state
      setProgress(100);
      setTimeout(() => {
        setIsVisible(false); // This will trigger opacity transition in TopProgressBar
        setTimeout(() => {
          setProgress(null); // Fully reset and hide after fade out
        }, 300); // Match this with opacity transition duration
      }, 500); // Show 100% for this duration
    }
  }, [isVisible, progress]);

  return (
    <LoadingContext.Provider value={{ progress, startLoading, finishLoading, updateProgress, isVisible }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};