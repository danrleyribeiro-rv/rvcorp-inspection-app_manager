// src/hooks/use-navigation.js
"use client";

import { useRouter } from 'next/navigation';
import { useLoading } from '@/context/loading-context';
import { useCallback } from 'react';

export function useNavigation() {
  const router = useRouter();
  const { startNavigation, endNavigation } = useLoading();

  const navigateTo = useCallback((href, options = {}) => {
    const { delay = 100, replace = false } = options;
    
    startNavigation();
    
    // Pequeno delay para mostrar o loading
    setTimeout(() => {
      if (replace) {
        router.replace(href);
      } else {
        router.push(href);
      }
      
      // Simula um tempo mínimo de loading para UX
      setTimeout(() => {
        endNavigation();
      }, 300);
    }, delay);
  }, [router, startNavigation, endNavigation]);

  const goBack = useCallback((options = {}) => {
    const { delay = 100 } = options;
    
    startNavigation();
    
    setTimeout(() => {
      router.back();
      setTimeout(() => {
        endNavigation();
      }, 300);
    }, delay);
  }, [router, startNavigation, endNavigation]);

  const refresh = useCallback((options = {}) => {
    const { delay = 100 } = options;
    
    startNavigation();
    
    setTimeout(() => {
      router.refresh();
      setTimeout(() => {
        endNavigation();
      }, 500);
    }, delay);
  }, [router, startNavigation, endNavigation]);

  return {
    navigateTo,
    goBack,
    refresh,
    push: navigateTo,
    replace: (href) => navigateTo(href, { replace: true })
  };
}