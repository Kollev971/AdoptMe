import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useLocation } from "wouter";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, DocumentData, getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
}

interface ChatRoom {
  participants: string[];
  listingId: string;
  createdAt: string;
}

export default function Chat() {
  const { user } = useAuth();
  const { chatId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);

  // Verify chat access
  useEffect(() => {
    if (!chatId || !user) return;

    const fetchChatRoom = async () => {
      try {
        const chatDoc = await getDoc(doc(db, "chats", chatId));
        if (!chatDoc.exists()) {
          toast({
            title: "Грешка",
            description: "Чатът не съществува",
            variant: "destructive",
          });
          setLocation("/profile");
          return;
        }

        const chatData = chatDoc.data() as ChatRoom;
        if (!chatData.participants.includes(user.uid)) {
          toast({
            title: "Грешка",
            description: "Нямате достъп до този чат",
            variant: "destructive",
          });
          setLocation("/profile");
          return;
        }

        setChatRoom(chatData);
      } catch (error) {
        console.error("Error fetching chat:", error);
        toast({
          title: "Грешка",
          description: "Възникна проблем при зареждането на чата",
          variant: "destructive",
        });
      }
    };

    fetchChatRoom();
  }, [chatId, user]);

  // Load messages
  useEffect(() => {
    if (!chatId || !user || !chatRoom) return;

    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [chatId, user, chatRoom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !chatId || !chatRoom) return;

    try {
      const messagesRef = collection(db, "chats", chatId, "messages");
      await addDoc(messagesRef, {
        text: newMessage,
        senderId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Грешка",
        description: "Съобщението не можа да бъде изпратено",
        variant: "destructive",
      });
    }
  };

  if (!chatId || !chatRoom) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <p className="text-center text-gray-500">Зареждане на чата...</p>
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
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-lg ${
                      msg.senderId === user?.uid
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="break-words">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <form onSubmit={handleSendMessage} className="flex gap-2 mt-4">
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