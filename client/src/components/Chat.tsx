import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToChat, sendMessage } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';

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
  const { user } = useAuth();

  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = subscribeToChat(chatId, (newMessages) => {
      setMessages(newMessages.sort((a, b) => a.timestamp - b.timestamp));
    });

    return () => unsubscribe();
  }, [chatId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    try {
      await sendMessage(chatId, user.uid, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto p-4">
      <ScrollArea className="h-[400px] p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.userId === user?.uid ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  msg.userId === user?.uid
                    ? 'bg-primary text-primary-foreground ml-auto'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm">{msg.message}</p>
                <span className="text-xs opacity-70">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button type="submit" disabled={!newMessage.trim()}>
          Send
        </Button>
      </form>
    </Card>
  );
};

export default Chat;
