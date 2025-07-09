// src/context/notification-context.jsx
"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { registerForNotifications } from '@/hooks/use-notifications';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) return;
    
    // Register for browser notifications
    registerForNotifications();
    
    // Listen for new messages
    
  }, [user]);

  return (
    <NotificationContext.Provider value={notifications}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}