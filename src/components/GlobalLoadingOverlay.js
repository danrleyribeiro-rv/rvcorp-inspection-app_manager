// src/components/GlobalLoadingOverlay.js
"use client";

import { useLoading } from '@/context/loading-context';
import { NavigationLoading, FullScreenLoading } from '@/components/ui/loading';

export default function GlobalLoadingOverlay() {
  const { navigationLoading, globalLoading } = useLoading();

  if (globalLoading) {
    return <FullScreenLoading message="Carregando aplicação..." />;
  }

  if (navigationLoading) {
    return <NavigationLoading />;
  }

  return null;
}