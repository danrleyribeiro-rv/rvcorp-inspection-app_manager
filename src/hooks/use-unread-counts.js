// src/hooks/useUnreadCounts.js
"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';

export function useUnreadCounts() {
  const [unreadCounts, setUnreadCounts] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) return () => {};

    // Query for messages where the current user is a recipient but hasn't read them
    const messagesQuery = query(
      collection(db, 'chat_messages'),
      where('received_by', 'array-contains', user.uid),
      where('sender_id', '!=', user.uid)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const counts = {};
      
      snapshot.docs.forEach(doc => {
        const message = doc.data();
        if (!message.read_by?.includes(user.uid)) {
          counts[message.chat_id] = (counts[message.chat_id] || 0) + 1;
        }
      });
      
      setUnreadCounts(counts);
    });

    return () => unsubscribe();
  }, [user]);

  return unreadCounts;
}