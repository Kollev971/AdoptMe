import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { database } from '@/lib/firebase';
import { ref, push, set, onValue, query, orderByChild } from 'firebase/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

interface Message {
  id: string;
  userId: string;
  message: string;
  timestamp: number;
}

interface ChatProps {
  chatId: string;
}

export const Chat: React.FC<ChatProps> = ({ chatId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [participantDetails, setParticipantDetails] = useState<Record<string, { email: string; photoURL?: string; }>>({});
  const [chatData, setChatData] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!chatId || !user) return;

    const chatRef = ref(database, `chats/${chatId}`);
    const unsubscribe = onValue(chatRef, (snapshot) => {
      const chatData = snapshot.val();
      if (chatData) {
        setParticipantDetails(chatData.participantDetails || {});
        setChatData(chatData);
      }
    });

    const messagesRef = ref(database, `chats/${chatId}/messages`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'));

    const messagesUnsubscribe = onValue(messagesQuery, (snapshot) => {
      const messagesData: Message[] = [];
      snapshot.forEach((childSnapshot) => {
        messagesData.push({
          id: childSnapshot.key!,
          ...childSnapshot.val()
        });
      });
      setMessages(messagesData);
      scrollToBottom();
    });

    return () => {
      unsubscribe();
      messagesUnsubscribe();
    };
  }, [chatId, user]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);
    try {
      const messagesRef = ref(database, `chats/${chatId}/messages`);
      const newMessageRef = push(messagesRef);
      const messageData = {
        userId: user.uid,
        message: newMessage,
        timestamp: Date.now()
      };

      await set(newMessageRef, messageData);
      await set(ref(database, `chats/${chatId}/lastMessage`), {
        text: newMessage,
        senderId: user.uid,
        timestamp: Date.now()
      });

      setNewMessage('');
      toast({ description: 'Съобщението е изпратено!' });
    } catch (error) {
      toast({ 
        description: 'Грешка при изпращане на съобщението!',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="w-full h-[80vh] flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          {Object.entries(participantDetails)
            .filter(([id]) => id !== user?.uid)
            .map(([id, details]) => (
              <div key={id} className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  {details.photoURL ? (
                    <AvatarImage src={details.photoURL} alt={details.email} />
                  ) : (
                    <AvatarFallback>
                      {details.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-medium">{details.email}</p>
                  {chatData?.listingDetails?.title && (
                    <p className="text-sm text-muted-foreground">
                      Относно: {chatData.listingDetails.title}
                    </p>
                  )}
                </div>
              </div>
            ))}
        </CardTitle>
      </CardHeader>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2 ${msg.userId === user?.uid ? 'justify-end' : 'justify-start'}`}
            >
              {msg.userId !== user?.uid && (
                <div className="flex flex-col items-center gap-1">
                  <Avatar className="w-8 h-8">
                    {participantDetails[msg.userId]?.photoURL ? (
                      <AvatarImage src={participantDetails[msg.userId].photoURL} alt="User avatar" />
                    ) : (
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {participantDetails[msg.userId]?.email?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    {participantDetails[msg.userId]?.email?.split('@')[0] || 'User'}
                  </span>
                </div>
              )}
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  msg.userId === user?.uid
                    ? 'bg-primary text-primary-foreground ml-auto'
                    : 'bg-secondary'
                }`}
              >
                <p className="text-sm break-words">{msg.message}</p>
                <span className="text-xs opacity-70 block mt-1">
                  {format(msg.timestamp, 'HH:mm')}
                </span>
              </div>
              {msg.userId === user?.uid && (
                <div className="flex flex-col items-center gap-1">
                  <Avatar className="w-8 h-8">
                    {user.photoURL ? (
                      <AvatarImage src={user.photoURL} alt="Your avatar" />
                    ) : (
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user.email?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span className="text-xs text-muted-foreground">You</span>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <form onSubmit={handleSendMessage} className="p-4 flex gap-2 border-t">
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
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </Card>
  );
};

export default Chat;