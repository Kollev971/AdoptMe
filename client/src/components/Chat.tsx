import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc,
  onSnapshot,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  arrayUnion
} from "firebase/firestore";
const db = getFirestore();
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

  // Improved user details fetching
  const fetchUserDetails = async (userId: string) => {
    if (!userId || participantDetails[userId]) return;

    try {
      console.log(`Fetching user details for ID: ${userId}`);
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log(`User data fetched for ${userId}:`, userData);
        setParticipantDetails(prev => ({
          ...prev,
          [userId]: userData
        }));
      } else {
        console.log(`No user document found for ID: ${userId}`);
      }
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
    }
  };

  useEffect(() => {
    if (!chatId || !user) return;

    console.log("Starting chat subscription for:", chatId);

    // Subscribe to chat document
    const chatDocRef = doc(db, 'chats', chatId);
    const unsubscribeChat = onSnapshot(chatDocRef, async (snapshot) => {
      const data = snapshot.data();
      console.log("Chat data received:", data);

      if (data) {
        // Fetch listing details
        if (data.listingId) {
          try {
            const listingRef = doc(db, 'listings', data.listingId);
            const listingDoc = await getDoc(listingRef);
            console.log("Listing details:", listingDoc.data());
            if (listingDoc.exists()) {
              data.listingDetails = listingDoc.data();
            }
          } catch (error) {
            console.error("Error fetching listing:", error);
          }
        }

        // Ensure we have both owner and requester details
        const promises = [];
        if (data.ownerId) {
          promises.push(fetchUserDetails(data.ownerId));
        }
        if (data.requesterId) {
          promises.push(fetchUserDetails(data.requesterId));
        }

        await Promise.all(promises);
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

      console.log("Messages updated:", messagesData);
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
      const messageData = {
        text: newMessage,
        senderId: user.uid,
        createdAt: serverTimestamp()
      };

      const messagesRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesRef, messageData);

      // Update chat document
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: messageData,
        participants: arrayUnion(user.uid),
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

  // Determine the other participant
  const otherParticipantId = chatData?.ownerId === user?.uid ? chatData?.requesterId : chatData?.ownerId;
  const otherParticipant = otherParticipantId ? participantDetails[otherParticipantId] : null;

  console.log("Chat render state:", {
    currentUser: user?.uid,
    otherParticipantId,
    otherParticipant,
    participantDetails,
    chatData
  });

  return (
    <Card className="w-full h-[80vh] flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            {otherParticipant?.photoURL ? (
              <AvatarImage src={otherParticipant.photoURL} alt={otherParticipant.displayName || otherParticipant.email} />
            ) : (
              <AvatarFallback>
                {(otherParticipant?.displayName || otherParticipant?.email || '?').charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <p className="font-medium">{otherParticipant?.displayName || otherParticipant?.email || 'Непознат потребител'}</p>
            {chatData?.listingDetails?.title && (
              <p className="text-sm text-muted-foreground">
                Относно: {chatData.listingDetails.title}
              </p>
            )}
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
                      <AvatarImage src={sender.photoURL} alt="User avatar" />
                    ) : (
                      <AvatarFallback>
                        {(sender?.displayName || sender?.email || '?').charAt(0).toUpperCase()}
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
                        {(user.email || '?').charAt(0).toUpperCase()}
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