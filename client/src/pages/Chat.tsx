
import { useEffect, useState, useRef } from "react";
import { useRoute } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
}

interface UserDetails {
  username: string;
  email: string;
  photoURL?: string;
}

export default function Chat() {
  const [, params] = useRoute("/chat/:chatId");
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!params?.chatId || !user) return;

    const fetchOtherUserDetails = async () => {
      const chatDoc = await getDoc(doc(db, "chats", params.chatId));
      if (chatDoc.exists()) {
        const chatData = chatDoc.data();
        const otherUserId = chatData.participants.find((id: string) => id !== user.uid);
        if (otherUserId) {
          const userDoc = await getDoc(doc(db, "users", otherUserId));
          if (userDoc.exists()) {
            setOtherUser(userDoc.data() as UserDetails);
          }
        }
      }
    };

    fetchOtherUserDetails();

    const messagesRef = collection(db, `chats/${params.chatId}/messages`);
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(newMessages);
      setLoading(false);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [params?.chatId, user]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !params?.chatId) return;

    try {
      const messagesRef = collection(db, `chats/${params.chatId}/messages`);
      await addDoc(messagesRef, {
        text: newMessage,
        senderId: user.uid,
        createdAt: serverTimestamp()
      });

      // Update last message in chat document
      await db.doc(`chats/${params.chatId}`).update({
        lastMessage: {
          text: newMessage,
          senderId: user.uid,
          timestamp: serverTimestamp()
        }
      });

      setNewMessage("");
      toast({ description: "Съобщението е изпратено!" });
    } catch (error: any) {
      toast({
        description: "Грешка при изпращане на съобщението: " + error.message,
        variant: "destructive"
      });
    }
  };

  if (!user || !params?.chatId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="h-[80vh]">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            {otherUser && (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  {otherUser.photoURL ? (
                    <AvatarImage src={otherUser.photoURL} alt={otherUser.username} />
                  ) : (
                    <AvatarFallback>
                      {otherUser.username?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-medium">{otherUser.username}</p>
                  <p className="text-sm text-muted-foreground">{otherUser.email}</p>
                </div>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col h-full">
          <ScrollArea className="flex-1 p-4">
            {loading ? (
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === user.uid ? "justify-end" : "justify-start"}`}
                  >
                    {message.senderId !== user.uid && (
                      <Avatar className="h-8 w-8 mr-2">
                        {otherUser?.photoURL ? (
                          <AvatarImage src={otherUser.photoURL} alt={otherUser.username} />
                        ) : (
                          <AvatarFallback>
                            {otherUser?.username?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    )}
                    <div
                      className={`rounded-lg px-4 py-2 max-w-[70%] ${
                        message.senderId === user.uid
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <div>{message.text}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {message.createdAt && format(message.createdAt.toDate(), "HH:mm")}
                      </div>
                    </div>
                    {message.senderId === user.uid && (
                      <Avatar className="h-8 w-8 ml-2">
                        {user.photoURL ? (
                          <AvatarImage src={user.photoURL} alt="You" />
                        ) : (
                          <AvatarFallback>
                            {user.email?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
          <form onSubmit={sendMessage} className="p-4 flex gap-2 border-t">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Напишете съобщение..."
              className="flex-1"
            />
            <Button type="submit">Изпрати</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
