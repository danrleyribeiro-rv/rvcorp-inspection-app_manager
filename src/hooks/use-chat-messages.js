// src/hooks/useChatMessages.js
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';

export function useChatMessages(chatId, messageLimit = 50) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const messagesQuery = query(
      collection(db, 'chat_messages'),
      where('chat_id', '==', chatId),
      orderBy('timestamp', 'desc'),
      limit(messageLimit)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      // Check if we might have more messages
      setHasMore(snapshot.docs.length === messageLimit);
      
      // Process and sort messages
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => {
        // Properly handle server timestamps
        const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp);
        const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp);
        return aTime - bTime;
      });
      
      setMessages(messagesData);
      setLoading(false);
      
      // Mark messages as received
      messagesData.forEach(message => {
        if (message.sender_id !== user?.uid && !message.received_by.includes(user?.uid)) {
          const messageRef = doc(db, 'chat_messages', message.id);
          updateDoc(messageRef, {
            received_by: [...message.received_by, user?.uid]
          });
        }
      });
      
      // Mark messages as read if chat is open
      messagesData.forEach(message => {
        if (message.sender_id !== user?.uid && !message.read_by.includes(user?.uid)) {
          const messageRef = doc(db, 'chat_messages', message.id);
          updateDoc(messageRef, {
            read_by: [...message.read_by, user?.uid],
            read_by_timestamp: new Date().toISOString()
          });
        }
      });
    });

    return () => unsubscribe();
  }, [chatId, messageLimit, user?.uid]);

  return { messages, loading, hasMore };
}