// src/hooks/use-notifications.js
"use client";

import { useEffect } from 'react';
import { useAuth } from '@/context/auth-context';

// Add these exported functions
export function registerForNotifications() {
  if ('Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission();
  }
}



// Keep the hook as well
export function useNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) return;
    registerForNotifications();
  }, [user]);

  const showNotification = (title, body, icon, onClick) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
      });
      
      if (onClick) {
        notification.onclick = onClick;
      }
    }
  };

  return { showNotification };
}