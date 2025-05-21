// src/context/notification-context.jsx
"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { showChatNotification, registerForNotifications } from '@/hooks/use-notifications';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) return;
    
    // Register for browser notifications
    registerForNotifications();
    
    // Listen for new messages
    const messagesQuery = query(
      collection(db, 'chat_messages'),
      where('received_by', 'array-contains', user.uid),
      where('sender_id', '!=', user.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    
    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      const changes = snapshot.docChanges();
      
      for (const change of changes) {
        // Only notify on new messages
        if (change.type === 'added') {
          const message = { id: change.doc.id, ...change.doc.data() };
          
          // Check if this message is new (using timestamp - messages newer than 10 seconds)
          const messageTime = message.timestamp?.toDate?.() || new Date(message.timestamp);
          const isRecent = (new Date() - messageTime) < 10000; // 10 seconds
          
          if (isRecent) {
            // Get chat details
            const chatRef = doc(db, 'chats', message.chat_id);
            const chatDoc = await getDoc(chatRef);
            
            if (chatDoc.exists()) {
              const chatDetails = chatDoc.data();
              
              // Check if chat is muted
              if (!chatDetails.muted_by?.includes(user.uid)) {
                // Show notification
                showChatNotification(message, chatDetails, () => {
                  window.focus();
                  window.location.href = `/chats?chat=${message.chat_id}`;
                });
              }
            }
          }
        }
      }
    });
    
    return () => unsubscribe();
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