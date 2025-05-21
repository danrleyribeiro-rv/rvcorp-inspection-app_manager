// src/components/GoToChatButton.jsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';

export default function GoToChatButton({ inspection, inspector, className }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const handleClick = async () => {
    if (!user?.uid || !inspection?.id || !inspector?.id) {
      toast({
        title: "Error",
        description: "Missing required information to start chat",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Check if chat already exists
      const chatsQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', user.uid),
        where('inspection_id', '==', inspection.id)
      );
      
      const chatsSnapshot = await getDocs(chatsQuery);
      
      let chatId;
      
      // If chat exists, use it
      if (!chatsSnapshot.empty) {
        chatId = chatsSnapshot.docs[0].id;
      } else {
        // Create new chat
        const chatData = {
          inspection_id: inspection.id,
          participants: [user.uid, inspector.id],
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          muted_by: [],
          inspector: {
            id: inspector.id,
            name: inspector.name || '',
            last_name: inspector.last_name || '',
            profileImageUrl: inspector.profileImageUrl || null
          },
          inspection: {
            id: inspection.id,
            title: inspection.title || 'Inspection'
          }
        };
        
        const newChatRef = await addDoc(collection(db, 'chats'), chatData);
        chatId = newChatRef.id;
        
        toast({
          title: "Chat created",
          description: "A new chat has been started for this inspection"
        });
      }
      
      // Navigate to chat
      router.push(`/chats?chat=${chatId}`);
      
    } catch (error) {
      console.error("Error creating/finding chat:", error);
      toast({
        title: "Error",
        description: "Failed to open chat",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Button 
      onClick={handleClick} 
      disabled={loading}
      className={className}
      variant="secondary"
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <MessageSquare className="mr-2 h-4 w-4" />
      )}
      {loading ? "Opening chat..." : "Chat with Inspector"}
    </Button>
  );
}