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

export function showChatNotification(message, chatDetails, onClick) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const senderName = chatDetails?.inspector?.name || 'Inspector';
    const title = `New message from ${senderName}`;
    
    const options = {
      body: message.type === 'text' ? message.content : `Sent a ${message.type}`,
      icon: chatDetails?.inspector?.profileImageUrl || '/favicon.ico',
    };
    
    const notification = new Notification(title, options);
    
    if (onClick) {
      notification.onclick = onClick;
    }
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