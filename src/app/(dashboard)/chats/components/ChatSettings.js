// src/app/(dashboard)/chats/components/ChatSettings.jsx
"use client";

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { BellOff, Bell, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ChatSettings({ chat, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const isMuted = chat?.muted_by?.includes(user?.uid);
  
  const toggleMuteChat = async () => {
    if (!chat?.id || !user?.uid) return;
    
    try {
      setLoading(true);
      const chatRef = doc(db, 'chats', chat.id);
      
      const newMutedBy = isMuted
        ? chat.muted_by.filter(id => id !== user.uid)
        : [...(chat.muted_by || []), user.uid];
      
      await updateDoc(chatRef, {
        muted_by: newMutedBy
      });
      
      toast({
        title: isMuted ? "Chat unmuted" : "Chat muted"
      });
    } catch (error) {
      console.error("Error toggling mute:", error);
      toast({
        title: "Error",
        description: "Failed to update notification settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const clearChatHistory = async () => {
    // This would delete all messages but keep the chat
    // In a real app, you'd want to implement this with a batch delete
    toast({
      title: "Not implemented",
      description: "This feature is not yet implemented"
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chat Settings</DialogTitle>
          <DialogDescription>
            Manage your preferences for this conversation
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isMuted ? (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Bell className="h-5 w-5" />
              )}
              <Label htmlFor="mute-chat">Mute Notifications</Label>
            </div>
            <Switch
              id="mute-chat"
              checked={isMuted}
              onCheckedChange={toggleMuteChat}
              disabled={loading}
            />
          </div>
          
          <div className="border-t pt-4">
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={clearChatHistory}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Chat History
            </Button>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}