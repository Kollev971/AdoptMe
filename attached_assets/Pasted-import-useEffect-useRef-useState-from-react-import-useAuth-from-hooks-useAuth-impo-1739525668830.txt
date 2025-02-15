import { useEffect, useRef, useState } from "react";
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
  updateDoc
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Send } from "lucide-react";

interface ChatProps {
  chatId: string;
}

export default function ChatComponent({ chatId }: ChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!user) return;

    const messagesQuery = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(newMessages);

      // Play sound for new messages
      if (
        newMessages.length > 0 &&
        newMessages[newMessages.length - 1].senderId !== user.uid
      ) {
        audioRef.current?.play();
      }

      // Auto scroll
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => unsubscribe();
  }, [chatId, user]);

  useEffect(() => {
    const fetchChatData = async () => {
      if (!user) return;

      const chatDoc = await getDoc(doc(db, "chats", chatId));
      if (chatDoc.exists()) {
        const chatData = chatDoc.data();
        const otherUserId = chatData.participants.find(
          (id: string) => id !== user.uid
        );

        if (otherUserId) {
          const userDoc = await getDoc(doc(db, "users", otherUserId));
          if (userDoc.exists()) {
            setOtherUser(userDoc.data());
          }
        }
      }
    };

    fetchChatData();
  }, [chatId, user]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    try {
      const messageRef = collection(db, "chats", chatId, "messages");
      await addDoc(messageRef, {
        text: newMessage,
        senderId: user.uid,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: {
          text: newMessage,
          senderId: user.uid,
          createdAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="border-b bg-primary/5">
        <CardTitle className="flex items-center gap-3">
          {otherUser && (
            <>
              <Avatar className="h-8 w-8 border border-primary/20">
                <AvatarImage src={otherUser.photoURL} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {otherUser.username?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <Link href={`/user/${otherUser.userId}`} className="hover:text-primary">
                <span>{otherUser.username}</span>
              </Link>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea ref={scrollRef} className="h-[600px] p-4">
          <div className="space-y-4">
            {messages.map((message) => {
              const isSender = message.senderId === user?.uid;
              return (
                <div
                  key={message.id}
                  className={`flex ${isSender ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] break-words rounded-lg p-3 ${
                      isSender
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p>{message.text}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isSender ? "text-primary-foreground/80" : "text-muted-foreground"
                      }`}
                    >
                      {message.createdAt &&
                        format(message.createdAt.toDate(), "HH:mm")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <form onSubmit={sendMessage} className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Напишете съобщение..."
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
      <audio ref={audioRef} src="/notification.wav" />
    </Card>
  );
}