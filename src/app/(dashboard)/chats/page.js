// src/app/(dashboard)/chats/page.js
"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, getDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import ChatList from './components/ChatList';
import ChatDetail from './components/ChatDetail';

function ChatsPageContent() {
  const [selectedChatId, setSelectedChatId] = useState(null);
  const searchParams = useSearchParams();
  const inspectorId = searchParams.get('inspector');
  const inspectionId = searchParams.get('inspection');
  const { user } = useAuth();

  // Handle direct chat opening from inspector profile
  useEffect(() => {
    if (inspectorId && inspectionId && user?.uid) {
      findOrCreateChat(inspectorId, inspectionId);
    }
  }, [inspectorId, inspectionId, user?.uid]);

  const findOrCreateChat = async (inspectorId, inspectionId) => {
    try {
      // Check if chat already exists
      const chatsQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', user.uid),
        where('inspection_id', '==', inspectionId)
      );
      
      const chatsSnapshot = await getDocs(chatsQuery);
      
      // If chat exists, open it
      if (!chatsSnapshot.empty) {
        setSelectedChatId(chatsSnapshot.docs[0].id);
        return;
      }
      
      // Get inspector details
      const inspectorDoc = await getDoc(doc(db, 'inspectors', inspectorId));
      if (!inspectorDoc.exists()) {
        console.error("Inspector not found");
        return;
      }
      
      // Get inspection details
      const inspectionDoc = await getDoc(doc(db, 'inspections', inspectionId));
      if (!inspectionDoc.exists()) {
        console.error("Inspection not found");
        return;
      }
      
      // Create new chat
      const newChatRef = await addDoc(collection(db, 'chats'), {
        inspection_id: inspectionId,
        participants: [user.uid, inspectorId],
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        muted_by: [],
        inspector: {
          id: inspectorId,
          name: inspectorDoc.data().name,
          last_name: inspectorDoc.data().last_name,
          profileImageUrl: inspectorDoc.data().profileImageUrl
        },
        inspection: {
          id: inspectionId,
          title: inspectionDoc.data().title
        }
      });
      
      setSelectedChatId(newChatRef.id);
      
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

  return (
    <div className="container p-0 h-[calc(100vh-120px)]">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 h-full">
        <div className="md:col-span-1">
          <ChatList 
            selectedChatId={selectedChatId} 
            onSelectChat={setSelectedChatId}
          />
        </div>
        <div className="md:col-span-2 lg:col-span-3 flex flex-col">
          <ChatDetail chatId={selectedChatId} />
        </div>
      </div>
    </div>
  );
}

export default function ChatsPage() {
  return (
    <Suspense fallback={<div className="container p-6 text-center">Carregando chats...</div>}>
      <ChatsPageContent />
    </Suspense>
  );
}