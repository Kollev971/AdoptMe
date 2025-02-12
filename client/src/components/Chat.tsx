import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { database } from '@/lib/firebase';
import { ref, push, set, onValue, query, orderByChild } from 'firebase/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from "lucide-react";

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
  type?: 'system' | 'user';
}

interface ChatProps {
  chatId: string;
}

export const Chat: React.FC<ChatProps> = ({ chatId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!chatId || !user) return;

    const messagesRef = ref(database, `chats/${chatId}/messages`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'));

    const unsubscribe = onValue(messagesQuery, (snapshot) => {
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
  }, [chatId, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim() || sending) return;

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
    } catch (error: any) {
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

  return (
    <Card className="w-full">
      <ScrollArea className="h-[400px] p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  msg.senderId === user?.uid
                    ? 'bg-primary text-primary-foreground ml-auto'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm break-words">{msg.text}</p>
                <span className="text-xs opacity-70">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <form onSubmit={handleSendMessage} className="p-4 flex gap-2">
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
    </Card>
  );
};

export default Chat;