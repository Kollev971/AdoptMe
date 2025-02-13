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

  useEffect(() => {
    if (!chatId || !user) return;

    // Subscribe to chat document
    const chatDocRef = doc(db, 'chats', chatId);
    const unsubscribeChat = onSnapshot(chatDocRef, async (snapshot) => {
      const data = snapshot.data();
      console.log("Chat data from Firebase:", data); // Debug log

      if (data) {
        // Ensure participants array exists and includes current user
        if (!data.participants) {
          await updateDoc(chatDocRef, {
            participants: arrayUnion(user.uid),
            ownerId: data.ownerId || user.uid,
            requesterId: data.requesterId || (data.ownerId === user.uid ? null : user.uid)
          });
        }

        // Fetch listing details
        if (data.listingId) {
          try {
            const listingRef = doc(db, 'listings', data.listingId);
            const listingDoc = await getDoc(listingRef);
            console.log("Listing data:", listingDoc.data()); // Debug log
            if (listingDoc.exists()) {
              data.listingDetails = listingDoc.data();
            }
          } catch (error) {
            console.error("Error fetching listing:", error);
          }
        }

        // Fetch owner details
        if (data.ownerId) {
          try {
            const ownerRef = doc(db, 'users', data.ownerId);
            const ownerDoc = await getDoc(ownerRef);
            console.log("Owner data:", data.ownerId, ownerDoc.data()); // Debug log
            if (ownerDoc.exists()) {
              setParticipantDetails(prev => ({
                ...prev,
                [data.ownerId]: ownerDoc.data()
              }));
            }
          } catch (error) {
            console.error("Error fetching owner:", error);
          }
        }

        // Fetch requester details
        if (data.requesterId) {
          try {
            const requesterRef = doc(db, 'users', data.requesterId);
            const requesterDoc = await getDoc(requesterRef);
            console.log("Requester data:", data.requesterId, requesterDoc.data()); // Debug log
            if (requesterDoc.exists()) {
              setParticipantDetails(prev => ({
                ...prev,
                [data.requesterId]: requesterDoc.data()
              }));
            }
          } catch (error) {
            console.error("Error fetching requester:", error);
          }
        }

        setChatData(data);
        console.log("Updated participant details:", participantDetails); // Debug log
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

      // Update chat document with last message and ensure current user is in participants
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

  const otherParticipantId = chatData?.ownerId === user?.uid ? chatData?.requesterId : chatData?.ownerId;
  console.log("Other participant ID:", otherParticipantId); // Debug log
  console.log("Other participant details:", otherParticipantId ? participantDetails[otherParticipantId] : null); // Debug log
  const otherParticipant = otherParticipantId ? participantDetails[otherParticipantId] : null;

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
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2 ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
            >
              {msg.senderId !== user?.uid && (
                <Avatar className="h-8 w-8">
                  {participantDetails[msg.senderId]?.photoURL ? (
                    <AvatarImage src={participantDetails[msg.senderId].photoURL} alt="User avatar" />
                  ) : (
                    <AvatarFallback>
                      {(participantDetails[msg.senderId]?.displayName || participantDetails[msg.senderId]?.email || '?').charAt(0).toUpperCase()}
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