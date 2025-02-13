import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  collection, 
  doc, 
  getDoc,
  onSnapshot,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { db } from '@/lib/firebase';
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
  senderId: string;
  text: string;
  createdAt: any;
}

interface ChatProps {
  chatId: string;
}

export const Chat: React.FC<ChatProps> = ({ chatId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [participantDetails, setParticipantDetails] = useState<Record<string, any>>({});
  const [chatData, setChatData] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchUserDetails = async (userId: string) => {
    if (!userId || participantDetails[userId]) return;

    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setParticipantDetails(prev => ({
          ...prev,
          [userId]: userData
        }));
      }
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
    }
  };

  useEffect(() => {
    if (!chatId || !user) return;

    // Subscribe to chat document
    const chatDocRef = doc(db, 'chats', chatId);
    const unsubscribeChat = onSnapshot(chatDocRef, async (snapshot) => {
      const data = snapshot.data();

      if (data) {
        // Ensure we have both owner and requester details
        if (data.ownerId) {
          await fetchUserDetails(data.ownerId);
        }
        if (data.requesterId) {
          await fetchUserDetails(data.requesterId);
        }
        setChatData(data);
      }
    });

    // Subscribe to messages collection
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];

      // For each message, ensure we have the sender's details
      messagesData.forEach(msg => {
        if (msg.senderId) {
          fetchUserDetails(msg.senderId);
        }
      });

      setMessages(messagesData);
      scrollToBottom();
    });

    return () => {
      unsubscribeChat();
      unsubscribeMessages();
    };
  }, [chatId, user]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);
    try {
      const [, ownerId, requesterId] = chatId.split('_');

      // Validate chat participants
      if (!ownerId || !requesterId) {
        throw new Error('Invalid chat ID format');
      }

      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);

      // Create or update chat document
      if (!chatDoc.exists()) {
        const newChatData = {
          ownerId,
          requesterId,
          participants: [ownerId, requesterId],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(chatRef, newChatData);
      }

      // Add the message
      const messageData = {
        text: newMessage,
        senderId: user.uid,
        createdAt: serverTimestamp()
      };

      const messagesRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesRef, messageData);

      // Update chat document with last message
      await updateDoc(chatRef, {
        lastMessage: messageData,
        updatedAt: serverTimestamp()
      });

      setNewMessage('');
    } catch (error: any) {
      toast({ 
        description: 'Грешка при изпращане на съобщението: ' + error.message,
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const otherParticipantId = chatData?.ownerId === user?.uid ? chatData?.requesterId : chatData?.ownerId;
  const otherParticipant = otherParticipantId ? participantDetails[otherParticipantId] : null;

  return (
    <Card className="w-full h-[80vh] flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            {otherParticipant?.photoURL ? (
              <AvatarImage src={otherParticipant.photoURL} alt={otherParticipant.username || 'User'} />
            ) : (
              <AvatarFallback>
                {(otherParticipant?.username || otherParticipant?.fullName || '?').charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <p className="font-medium">
              {otherParticipant?.username || otherParticipant?.fullName || 'Непознат потребител'}
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => {
            const sender = participantDetails[msg.senderId];
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2 ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
              >
                {msg.senderId !== user?.uid && (
                  <Avatar className="h-8 w-8">
                    {sender?.photoURL ? (
                      <AvatarImage src={sender.photoURL} alt={sender.username || 'User avatar'} />
                    ) : (
                      <AvatarFallback>
                        {(sender?.username || sender?.fullName || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                )}
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.senderId === user?.uid
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary'
                  }`}
                >
                  <p className="text-sm break-words">{msg.text}</p>
                  <span className="text-xs opacity-70 block mt-1">
                    {msg.createdAt && format(msg.createdAt.toDate(), 'HH:mm')}
                  </span>
                </div>
                {msg.senderId === user?.uid && (
                  <Avatar className="h-8 w-8">
                    {user.photoURL ? (
                      <AvatarImage src={user.photoURL} alt="Your avatar" />
                    ) : (
                      <AvatarFallback>
                        {(user.displayName || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                )}
              </div>
            );
          })}
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