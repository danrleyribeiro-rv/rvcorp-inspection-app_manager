// src/hooks/use-navigation.js
"use client";

import { useRouter } from 'next/navigation';
import { useLoading } from '@/context/loading-context';
import { useCallback } from 'react';

export function useNavigation() {
  const router = useRouter();
  
  let loadingContext;
  try {
    loadingContext = useLoading();
  } catch (error) {
    loadingContext = null;
  }
  
  const navigateTo = useCallback((href, options = {}) => {
    const { delay = 100, replace = false } = options;
    
    if (loadingContext?.startNavigation) {
      loadingContext.startNavigation();
      
      // Pequeno delay para mostrar o loading
      setTimeout(() => {
        if (replace) {
          router.replace(href);
        } else {
          router.push(href);
        }
        
        // Simula um tempo mínimo de loading para UX
        setTimeout(() => {
          loadingContext.endNavigation();
        }, 300);
      }, delay);
    } else {
      // Navegação direta sem loading se contexto não estiver disponível
      if (replace) {
        router.replace(href);
      } else {
        router.push(href);
      }
    }
  }, [router, loadingContext]);

  const goBack = useCallback((options = {}) => {
    const { delay = 100 } = options;
    
    if (loadingContext?.startNavigation) {
      loadingContext.startNavigation();
      
      setTimeout(() => {
        router.back();
        setTimeout(() => {
          loadingContext.endNavigation();
        }, 300);
      }, delay);
    } else {
      router.back();
    }
  }, [router, loadingContext]);

  const refresh = useCallback((options = {}) => {
    const { delay = 100 } = options;
    
    if (loadingContext?.startNavigation) {
      loadingContext.startNavigation();
      
      setTimeout(() => {
        router.refresh();
        setTimeout(() => {
          loadingContext.endNavigation();
        }, 500);
      }, delay);
    } else {
      router.refresh();
    }
  }, [router, loadingContext]);

  return {
    navigateTo,
    goBack,
    refresh,
    push: navigateTo,
    replace: (href) => navigateTo(href, { replace: true })
  };
}