import { useEffect, useState, useRef } from "react";
import { useRoute } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
}

export default function Chat() {
  const [, params] = useRoute("/chat/:chatId");
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!params?.chatId || !user) return;

    const fetchChatDetails = async () => {
      const chatDocRef = doc(db, "chats", params.chatId);
      const chatDoc = await getDoc(chatDocRef);

      if (chatDoc.exists()) {
        const chatData = chatDoc.data();
        const otherUserId = chatData.participants.find((id: string) => id !== user.uid);

        if (otherUserId) {
          try {
            const userDoc = await getDoc(doc(db, "users", otherUserId));
            if (userDoc.exists()) {
              setOtherUser(userDoc.data());
            }
          } catch (error) {
            console.error("Error fetching user data:", error);
          }
        }
      }
    };

    fetchChatDetails();

    const messagesRef = collection(db, `chats/${params.chatId}/messages`);
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
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
        createdAt: serverTimestamp(),
      });
      setNewMessage("");
    } catch (error: any) {
      toast({
        description: "Грешка при изпращане на съобщението: " + error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="h-[80vh] rounded-2xl shadow-xl">
        <CardHeader className="border-b flex items-center gap-3 p-4 bg-gray-100 rounded-t-2xl">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{otherUser?.name?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-lg font-semibold">{otherUser?.name || "Непознат"}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col h-full p-0">
          <ScrollArea className="flex-1 p-4 bg-gray-50">
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
                    <div
                      className={`rounded-2xl px-4 py-2 max-w-[70%] text-white shadow-md ${
                        message.senderId === user.uid ? "bg-blue-600" : "bg-gray-700"
                      }`}
                    >
                      <div>{message.text}</div>
                      <div className="text-xs opacity-70 mt-1 text-gray-300">
                        {message.createdAt && format(message.createdAt.toDate(), "HH:mm")}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
          <form onSubmit={sendMessage} className="p-4 flex gap-2 border-t bg-gray-100 rounded-b-2xl">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Напишете съобщение..."
              className="flex-1 rounded-xl"
            />
            <Button type="submit" className="rounded-xl">Изпрати</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
