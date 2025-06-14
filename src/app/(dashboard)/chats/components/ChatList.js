// src/app/(dashboard)/chats/components/ChatList.js
"use client";

import { useState } from 'react';
import { useChats } from '@/hooks/use-chats';
import { useUnreadCounts } from '@/hooks/use-unread-counts';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, BellOff } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/auth-context';

export default function ChatList({ selectedChatId, onSelectChat }) {
  const { chats, loading } = useChats();
  const unreadCounts = useUnreadCounts();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const { user } = useAuth();

  const getFullInspectorName = (inspector) => {
    if (!inspector?.name) return 'Unknown Inspector';
    const firstName = inspector.name || '';
    const lastName = inspector.last_name || '';
    return `${firstName} ${lastName}`.trim();
  };

  // Adicione esta função
  const formatMessageTime = (timestamp) => {
    try {
      if (!timestamp) return '';
      
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      
      if (isNaN(date.getTime())) return '';
      
      return format(date, 'HH:mm');
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return '';
    }
  };

  // Apply filters and search
  const filteredChats = chats.filter(chat => {
    // Only show chats with unread messages if filter is 'unread'
    if (filter === 'unread' && !unreadCounts[chat.id]) {
      return false;
    }
    
    // Apply search term to inspector name or last message
    if (search && !(
      chat.inspector?.name?.toLowerCase().includes(search.toLowerCase()) ||
      chat.last_message?.text?.toLowerCase().includes(search.toLowerCase())
    )) {
      return false;
    }
    
    return true;
  });

    const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (loading) {
    return <div className="flex justify-center p-6">Loading chats...</div>;
  }

  return (
    <div className="border-r h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold mb-2">Chats {totalUnread > 0 && (
          <Badge variant="destructive" className="ml-2">{totalUnread}</Badge>
        )}</h2>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2 mt-2">
          <Button 
            variant={filter === 'all' ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button 
            variant={filter === 'unread' ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            Unread
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No chats found
          </div>
        ) : (
          filteredChats.map(chat => (
            <div 
              key={chat.id}
              className={`p-3 border-b cursor-pointer hover:bg-accent/20 flex items-center gap-3 ${
                selectedChatId === chat.id ? 'bg-accent' : ''
              }`}
              onClick={() => onSelectChat(chat.id)}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage 
                  src={chat.inspector?.profileImageUrl} 
                  alt={chat.inspector?.name || 'Inspector'}
                />
                <AvatarFallback>
                  {getInitials(chat.inspector?.name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-sm truncate">
                    {getFullInspectorName(chat.inspector)}
                  </h3>
                  <div className="flex items-center">
                    {chat.muted_by?.includes(user?.uid) && (
                      <BellOff className="h-3 w-3 text-muted-foreground mr-1" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatMessageTime(chat.last_message?.timestamp)}
                    </span>
                  </div>
                </div>
                
                {/* Nome da inspeção */}
                <p className="text-xs text-muted-foreground truncate mb-1">
                  {chat.inspection?.cod || 'Inspeção'}
                </p>
                
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground truncate">
                    {chat.last_message?.text || 'No messages yet'}
                  </p>
                  {unreadCounts[chat.id] > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                      {unreadCounts[chat.id]}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}