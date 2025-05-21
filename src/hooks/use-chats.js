// src/hooks/useChats.js
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';

export function useChats() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) return;

    setLoading(true);
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('updated_at', 'desc')
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const chatsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        unreadCount: 0 // Will be populated later
      }));
      
      setChats(chatsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { chats, loading };
}