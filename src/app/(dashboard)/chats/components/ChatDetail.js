// src/app/(dashboard)/chats/components/ChatDetail.jsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, doc, addDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/context/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BellOff, Bell, Image, Paperclip, Send, CheckCheck, Check, Clock, Eye, FileText, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ChatDetail({ chatId }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [chatDetails, setChatDetails] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch chat details
  useEffect(() => {
    if (!chatId) return;

    const chatRef = doc(db, 'chats', chatId);
    const unsubscribe = onSnapshot(chatRef, (doc) => {
      if (doc.exists()) {
        setChatDetails(doc.data());
      }
    });

    return () => unsubscribe();
  }, [chatId]);

  // Fetch messages
  useEffect(() => {
    if (!chatId) return;

    setLoading(true);
    const messagesQuery = query(
      collection(db, 'chat_messages'),
      where('chat_id', '==', chatId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setMessages(messagesData);
      setLoading(false);
      
      // Mark messages as read and handle notifications
      messagesData.forEach(async message => {
        if (message.sender_id !== user?.uid && !message.read_by?.includes(user?.uid)) {
          try {
            const messageRef = doc(db, 'chat_messages', message.id);
            await updateDoc(messageRef, {
              read_by: [...(message.read_by || []), user.uid],
              read_by_timestamp: serverTimestamp()
            });
            
            // Update last message in chat to show as read
            if (chatDetails?.last_message?.sender_id === message.sender_id) {
              const chatRef = doc(db, 'chats', chatId);
              await updateDoc(chatRef, {
                'last_message.read_by': [...(chatDetails.last_message.read_by || []), user.uid]
              });
            }
          } catch (error) {
            console.error("Error marking message as read:", error);
          }
        }
      });
      
      // Check for new messages from the other user and notify if needed
      const newMessages = snapshot.docChanges()
        .filter(change => 
          change.type === 'added' && 
          change.doc.data().sender_id !== user?.uid &&
          !change.doc.data().read_by?.includes(user?.uid)
        )
        .map(change => ({
          id: change.doc.id,
          ...change.doc.data()
        }));
      
      // Only show notifications for really new messages (within last 5 seconds)
      const recentMessages = newMessages.filter(msg => {
        const msgTime = msg.timestamp?.toDate?.() || new Date(msg.timestamp);
        return (Date.now() - msgTime) < 5000; // 5 seconds
      });
      
      // Show browser notification if tab is not focused
      if (!document.hasFocus() && recentMessages.length > 0) {
        recentMessages.forEach(message => {
          const senderName = chatDetails?.inspector?.name || 'Inspector';
          const notifTitle = `Message from ${senderName}`;
          const notifBody = message.type === 'text' 
            ? message.content 
            : `Sent a ${message.type}`;
          
          // Show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(notifTitle, {
              body: notifBody,
              icon: chatDetails?.inspector?.profileImageUrl || '/favicon.ico'
            });
            
            notification.onclick = () => {
              window.focus();
              window.location.href = `/chats?chat=${chatId}`;
            };
          }
        });
      }
    });

    return () => unsubscribe();
  }, [chatId, user?.uid, chatDetails]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check if file size is less than 100MB
      if (selectedFile.size > 100 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 100MB",
          variant: "destructive"
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const getFileType = (file) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'file';
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !file) || !user?.uid || !chatId) return;
    
    try {
      setSending(true);
      
      let fileUrl = null;
      let fileName = null;
      let fileSize = null;
      let fileType = 'text';
      
      // Upload file if selected
      if (file) {
        setUploading(true);
        const fileRef = ref(storage, `chats/${chatId}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        fileUrl = await getDownloadURL(fileRef);
        fileName = file.name;
        fileSize = file.size;
        fileType = getFileType(file);
      }
      
      // Add message
      const messageData = {
        chat_id: chatId,
        sender_id: user.uid,
        content: newMessage.trim(),
        timestamp: serverTimestamp(),
        type: fileType,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        read_by: [],
        received_by: [user.uid]
      };
      
      await addDoc(collection(db, 'chat_messages'), messageData);
      
      // Update last message in chat
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        last_message: {
          text: fileType !== 'text' ? `Sent a ${fileType}` : newMessage.trim(),
          sender_id: user.uid,
          timestamp: new Date().toISOString(),
          type: fileType
        },
        updated_at: serverTimestamp()
      });
      
      setNewMessage('');
      setFile(null);
      setUploading(false);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const toggleMute = async () => {
    if (!chatDetails || !user?.uid) return;
    
    try {
      const chatRef = doc(db, 'chats', chatId);
      
      const isMuted = chatDetails.muted_by?.includes(user.uid);
      const newMutedBy = isMuted
        ? chatDetails.muted_by.filter(id => id !== user.uid)
        : [...(chatDetails.muted_by || []), user.uid];
      
      await updateDoc(chatRef, {
        muted_by: newMutedBy
      });
      
      toast({
        title: isMuted ? "Chat unmuted" : "Chat muted",
        description: isMuted 
          ? "You will now receive notifications for this chat" 
          : "You will no longer receive notifications for this chat"
      });
    } catch (error) {
      console.error("Error toggling mute:", error);
      toast({
        title: "Error",
        description: "Failed to update notification settings",
        variant: "destructive"
      });
    }
  };

  const getFullInspectorName = () => {
    if (!chatDetails?.inspector?.name) return 'Unknown Inspector';
    const firstName = chatDetails.inspector.name || '';
    const lastName = chatDetails.inspector.last_name || '';
    return `${firstName} ${lastName}`.trim();
  };

  const formatMessageTime = (timestamp) => {
      try {
        if (!timestamp) return '';
        
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        
        if (isNaN(date.getTime())) return '';
        
        // If it's today, show time only
        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
          return format(date, 'HH:mm');
        }
        
        // If within last week, show day and time
        if (date > new Date(today.setDate(today.getDate() - 7))) {
          return format(date, 'EEE, HH:mm', { locale: ptBR });
        }
        
        // Otherwise show full date
        return format(date, 'dd/MM/yyyy HH:mm');
      } catch (error) {
        console.error('Error formatting timestamp:', error);
        return '';
      }
    };

  const getInitials = (name) => {
    if (!chatDetails?.inspector?.name) return '??';
    return chatDetails.inspector.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getMessageStatus = (message) => {
    const isSender = message.sender_id === user?.uid;
    
    if (!isSender) return null;
    
    if (message.read_by?.length > 0) {
      return {
        icon: <CheckCheck className="h-3 w-3 text-blue-500" />,
        text: "Read",
        time: message.read_by_timestamp
      };
    }
    
    if (message.received_by?.length > 1) {
      return {
        icon: <Check className="h-3 w-3" />,
        text: "Delivered",
        time: message.received_by_timestamp
      };
    }
    
    return {
      icon: <Clock className="h-3 w-3" />,
      text: "Sent",
      time: message.timestamp
    };
  };

  if (!chatId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Select a chat to start messaging
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="border-b p-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage 
              src={chatDetails?.inspector?.profileImageUrl} 
              alt={chatDetails?.inspector?.name || 'Inspector'}
            />
            <AvatarFallback>
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">
              {getFullInspectorName()}
            </h3>
            <p className="text-xs text-muted-foreground">
              {chatDetails?.inspection?.title || 'Inspection'}
            </p>
          </div>
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
              >
                {chatDetails?.muted_by?.includes(user?.uid) ? (
                  <BellOff className="h-5 w-5" />
                ) : (
                  <Bell className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {chatDetails?.muted_by?.includes(user?.uid) ? 'Unmute chat' : 'Mute chat'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const isSender = message.sender_id === user?.uid;
              const status = getMessageStatus(message);
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] ${
                      isSender 
                        ? 'bg-primary text-primary-foreground rounded-tl-xl rounded-bl-xl rounded-tr-xl' 
                        : 'bg-accent rounded-tr-xl rounded-br-xl rounded-tl-xl'
                    } p-3`}
                  >
                    {/* File attachments */}
                    {message.type !== 'text' && message.file_url && (
                      <div className="mb-2">
                        {message.type === 'image' ? (
                          <img 
                            src={message.file_url} 
                            alt="Image" 
                            className="rounded-lg max-h-60 w-auto cursor-pointer"
                            onClick={() => window.open(message.file_url, '_blank')}
                          />
                        ) : message.type === 'video' ? (
                          <video 
                            src={message.file_url} 
                            className="rounded-lg max-h-60 w-auto" 
                            controls
                          />
                        ) : (
                          <div 
                            className="flex items-center gap-2 p-2 bg-background/50 rounded-lg cursor-pointer"
                            onClick={() => window.open(message.file_url, '_blank')}
                          >
                            <FileText className="h-5 w-5" />
                            <div className="overflow-hidden">
                              <p className="text-sm truncate">{message.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {Math.round(message.file_size / 1024)} KB
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Text content */}
                    {message.content && (
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                    
                    {/* Message timestamp and status */}
                    <div className={`flex items-center gap-1 mt-1 text-xs ${
                      isSender ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      <span>{formatMessageTime(message.timestamp)}</span>
                      {status && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="ml-1">{status.icon}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {status.text} {status.time && formatMessageTime(status.time)}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Input area */}
      <div className="border-t p-3">
        {file && (
          <div className="mb-2 p-2 bg-accent rounded-md flex justify-between items-center">
            <div className="flex items-center gap-2">
              {file.type.startsWith('image/') ? (
                <Image className="h-5 w-5" />
              ) : file.type.startsWith('video/') ? (
                <Video className="h-5 w-5" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
              <span className="text-sm truncate max-w-[200px]">{file.name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFile(null)}
            >
              Cancel
            </Button>
          </div>
        )}
        
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || uploading}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
          />
          
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={sending || uploading}
            className="flex-1"
          />
          
          <Button
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && !file) || sending || uploading}
          >
            {sending || uploading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}