// src/context/loading-context.js
"use client";

import { createContext, useContext, useState, useCallback } from 'react';

const LoadingContext = createContext();

export function LoadingProvider({ children }) {
  const [loadingStates, setLoadingStates] = useState({});
  const [globalLoading, setGlobalLoading] = useState(false);
  const [navigationLoading, setNavigationLoading] = useState(false);

  const setLoading = useCallback((key, isLoading) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: isLoading
    }));
  }, []);

  const isLoading = useCallback((key) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const clearLoading = useCallback(() => {
    setLoadingStates({});
    setGlobalLoading(false);
    setNavigationLoading(false);
  }, []);

  const startNavigation = useCallback(() => {
    setNavigationLoading(true);
  }, []);

  const endNavigation = useCallback(() => {
    setNavigationLoading(false);
  }, []);

  const value = {
    loadingStates,
    globalLoading,
    navigationLoading,
    setLoading,
    isLoading,
    clearLoading,
    setGlobalLoading,
    startNavigation,
    endNavigation
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}