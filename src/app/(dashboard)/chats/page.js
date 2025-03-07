// app/(dashboard)/chats/page.js
"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCircle, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/context/auth-context";

export default function ChatPage() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatType, setChatType] = useState("inspector"); // "inspector" or "client"
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadChats();
    }
  }, [chatType, user]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages();
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChats = async () => {
    try {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
          id,
          title,
          last_message,
          last_message_time,
          chat_type,
          conversation_participants!inner(user_id)
        `)
        .eq('chat_type', chatType)
        .eq('conversation_participants.user_id', user.id)
        .order('last_message_time', { ascending: false });
        
      if (error) throw error;
      setChats(conversations || []);
    } catch (error) {
      console.error("Error loading chats:", error);
    }
  };

  const loadMessages = async () => {
    try {
      // Subscribe to new messages
      const messagesSubscription = supabase
        .channel(`messages:conversation_id=eq.${selectedChat.id}`)
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedChat.id}` },
          payload => {
            setMessages(current => [...current, payload.new]);
          }
        )
        .subscribe();
        
      // Load existing messages
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          user_id,
          users:user_id (name, email)
        `)
        .eq('conversation_id', selectedChat.id)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      setMessages(data || []);
      
      return () => {
        messagesSubscription.unsubscribe();
      };
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      // Add message to database
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedChat.id,
          content: newMessage,
          user_id: user.id
        })
        .select();
        
      if (error) throw error;
      
      // Update last message in conversation
      await supabase
        .from('conversations')
        .update({
          last_message: newMessage,
          last_message_time: new Date()
        })
        .eq('id', selectedChat.id);

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="container h-[calc(100vh-6rem)] p-8">
      <Tabs defaultValue="inspector" className="h-full">
        <TabsList>
          <TabsTrigger 
            value="inspector" 
            onClick={() => setChatType("inspector")}
            className="flex items-center gap-2"
          >
            <UserCircle className="h-4 w-4" />
            Chat com Inspetores
          </TabsTrigger>
          <TabsTrigger 
            value="client" 
            onClick={() => setChatType("client")}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Chat com Clientes
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-[300px,1fr] gap-4 h-[calc(100%-2rem)] mt-4">
          {/* Chat List */}
          <Card className="p-4">
            <ScrollArea className="h-full">
              {chats.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Nenhuma conversa encontrada
                </div>
              ) : (
                chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`p-4 cursor-pointer rounded-lg mb-2 ${
                      selectedChat?.id === chat.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    }`}
                    onClick={() => setSelectedChat(chat)}
                  >
                    <div className="font-medium">{chat.title}</div>
                    <div className="text-sm opacity-70">
                      {chat.last_message}
                    </div>
                    {chat.last_message_time && (
                      <div className="text-xs opacity-50">
                        {format(new Date(chat.last_message_time), "PPp", {
                          locale: ptBR,
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </ScrollArea>
          </Card>

          {/* Chat Area */}
          <Card className="p-4 flex flex-col">
            {selectedChat ? (
              <>
                <div className="mb-4 pb-4 border-b">
                  <h2 className="font-semibold">{selectedChat.title}</h2>
                </div>

                <ScrollArea className="flex-1 mb-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.user_id === user.id
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.user_id === user.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-accent"
                          }`}
                        >
                          <div>{message.content}</div>
                          {message.created_at && (
                            <div className="text-xs opacity-50 mt-1">
                              {format(new Date(message.created_at), "p", {
                                locale: ptBR,
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <form onSubmit={sendMessage} className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1"
                  />
                  <Button type="submit">Enviar</Button>
                </form>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Selecione um chat para começar
              </div>
            )}
          </Card>
        </div>
      </Tabs>
    </div>
  );
}