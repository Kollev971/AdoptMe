import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useLocation } from "wouter";
import { ref, onValue, push, set, serverTimestamp } from "firebase/database";
import { database } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
  type?: 'system' | 'user';
}

interface ChatRoom {
  participants: { [key: string]: boolean };
  participantEmails?: { [key: string]: string };
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: number;
  };
}

export default function Chat() {
  const { user } = useAuth();
  const { chatId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Verify chat access
  useEffect(() => {
    if (!chatId || !user) return;

    const chatRef = ref(database, `chats/${chatId}`);
    const unsubscribe = onValue(chatRef, (snapshot) => {
      if (!snapshot.exists()) {
        toast({
          title: "Грешка",
          description: "Чатът не съществува",
          variant: "destructive",
        });
        setLocation("/profile");
        return;
      }

      const chatData = snapshot.val() as ChatRoom;
      if (!chatData.participants[user.uid]) {
        toast({
          title: "Грешка",
          description: "Нямате достъп до този чат",
          variant: "destructive",
        });
        setLocation("/profile");
        return;
      }

      setChatRoom(chatData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId, user]);

  // Load messages
  useEffect(() => {
    if (!chatId || !user || !chatRoom) return;

    const messagesRef = ref(database, `chats/${chatId}/messages`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const messagesData: Message[] = [];
      snapshot.forEach((childSnapshot) => {
        messagesData.push({
          id: childSnapshot.key!,
          ...childSnapshot.val()
        });
      });
      setMessages(messagesData.sort((a, b) => a.timestamp - b.timestamp));
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [chatId, user, chatRoom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !chatId || !chatRoom || sending) return;

    try {
      setSending(true);
      const messagesRef = ref(database, `chats/${chatId}/messages`);
      const newMessageRef = push(messagesRef);
      const messageData = {
        text: newMessage,
        senderId: user.uid,
        timestamp: Date.now(),
        type: 'user'
      };

      await set(newMessageRef, messageData);

      // Update last message in chat room
      await set(ref(database, `chats/${chatId}/lastMessage`), {
        text: newMessage,
        senderId: user.uid,
        timestamp: Date.now()
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Грешка",
        description: "Съобщението не можа да бъде изпратено",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Зареждане на чата...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 h-screen flex flex-col">
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle>Чат</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 h-[500px] pr-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === user?.uid ? "justify-end" : "justify-start"}`}
                >
                  {msg.type === 'system' ? (
                    <div className="bg-muted/50 px-4 py-2 rounded-lg text-sm text-center w-full">
                      {msg.text}
                    </div>
                  ) : (
                    <div
                      className={`max-w-[80%] px-4 py-2 rounded-lg ${
                        msg.senderId === user?.uid
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="break-words">{msg.text}</p>
                      <span className="text-xs opacity-50 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          <form onSubmit={handleSendMessage} className="flex gap-2 mt-4">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Напишете съобщение..."
              className="flex-1"
              disabled={sending}
            />
            <Button type="submit" disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Изпрати"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}