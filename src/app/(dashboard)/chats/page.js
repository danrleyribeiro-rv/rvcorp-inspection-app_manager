// src/app/(dashboard)/chats/page.js
"use client";

import { useState, useEffect, useRef } from "react";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCircle, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ChatPage() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatType, setChatType] = useState("inspector"); // "inspector" ou "client"
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadChats();
  }, [chatType]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages();
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChats = () => {
    const q = query(
      collection(db, "chats"),
      where("type", "==", chatType),
      orderBy("lastMessageAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
      const chatsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setChats(chatsData);
    });
  };

  const loadMessages = () => {
    const q = query(
      collection(db, "messages"),
      where("chatId", "==", selectedChat.id),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(messagesData);
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await addDoc(collection(db, "messages"), {
        chatId: selectedChat.id,
        text: newMessage,
        senderId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="container h-[calc(100vh-6rem)] p-8 ">
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
          {/* Lista de Chats */}
          <Card className="p-4">
            <ScrollArea className="h-full">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`p-4 cursor-pointer rounded-lg mb-2 ${
                    selectedChat?.id === chat.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => setSelectedChat(chat)}
                >
                  <div className="font-medium">{chat.name}</div>
                  <div className="text-sm opacity-70">
                    {chat.lastMessage?.text}
                  </div>
                  {chat.lastMessage?.createdAt && (
                    <div className="text-xs opacity-50">
                      {format(chat.lastMessage.createdAt.toDate(), "PPp", {
                        locale: ptBR,
                      })}
                    </div>
                  )}
                </div>
              ))}
            </ScrollArea>
          </Card>

          {/* Área de Chat */}
          <Card className="p-4 flex flex-col">
            {selectedChat ? (
              <>
                <div className="mb-4 pb-4 border-b">
                  <h2 className="font-semibold">{selectedChat.name}</h2>
                </div>

                <ScrollArea className="flex-1 mb-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.senderId === auth.currentUser.uid
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.senderId === auth.currentUser.uid
                              ? "bg-primary text-primary-foreground"
                              : "bg-accent"
                          }`}
                        >
                          <div>{message.text}</div>
                          {message.createdAt && (
                            <div className="text-xs opacity-50 mt-1">
                              {format(message.createdAt.toDate(), "p", {
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