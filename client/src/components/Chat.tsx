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
  updateDoc,
  setDoc
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Send } from "lucide-react";
import { Link } from "wouter";

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
  read?: boolean;
}

interface ChatProps {
  chatId: string;
}

export default function ChatComponent({ chatId }: ChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const lastPlayedRef = useRef<number>(0);

  useEffect(() => {
    if (!user) return;

    const messagesQuery = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      setMessages(newMessages);

      const lastMessage = newMessages[newMessages.length - 1];
      if (lastMessage && 
          lastMessage.senderId !== user.uid && 
          lastMessage.createdAt?.toMillis() > lastPlayedRef.current) {
        audioRef.current?.play().catch(() => {});
        lastPlayedRef.current = lastMessage.createdAt?.toMillis() || Date.now();
      }

      scrollToBottom();
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
            const userData = userDoc.data();
            setOtherUser({
              userId: otherUserId,
              username: userData.username,
              photoURL: userData.photoURL,
            });
          }
        }
      }
    };

    fetchChatData();
  }, [chatId, user]);

  useEffect(() => {
    if (!user || !otherUser) return;

    const typingRef = doc(db, `chats/${chatId}/typing/${otherUser.userId}`);
    const unsubscribe = onSnapshot(typingRef, (doc) => {
      if (doc.exists() && doc.data()?.timestamp) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      } else {
        setIsTyping(false);
      }
    });

    return () => unsubscribe();
  }, [chatId, user, otherUser]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleTyping = async () => {
    if (!user || !otherUser) return;

    const typingRef = doc(db, `chats/${chatId}/typing/${user.uid}`);
    await setDoc(typingRef, { timestamp: serverTimestamp() });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(async () => {
      await setDoc(typingRef, { timestamp: null });
    }, 3000);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    try {
      const messageRef = collection(db, "chats", chatId, "messages");
      const messageData = {
        text: newMessage,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        read: false
      };

      await addDoc(messageRef, messageData);

      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: {
          text: newMessage,
          senderId: user.uid,
          createdAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      });

      setNewMessage("");
      inputRef.current?.focus();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <Card className="border-none shadow-lg bg-white dark:bg-zinc-950">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
        <CardTitle className="flex items-center gap-3">
          {otherUser && (
            <>
              <Avatar className="h-10 w-10 ring-2 ring-primary/20 ring-offset-2 ring-offset-background transition-all">
                <AvatarImage src={otherUser.photoURL} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {otherUser.username?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <Link href={`/user/${otherUser.userId}`} className="hover:text-primary transition-colors">
                <span className="font-medium">{otherUser.username || "User Not Found"}</span>
              </Link>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea ref={scrollRef} className="h-[600px] px-4 py-6">
          <div className="space-y-4">
            {messages.map((message) => {
              const isSender = message.senderId === user?.uid;
              return (
                <div
                  key={message.id}
                  className={`flex ${isSender ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`
                      max-w-[70%] break-words rounded-2xl px-4 py-2
                      ${isSender 
                        ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-md" 
                        : "bg-zinc-100 dark:bg-zinc-900 shadow-sm"}
                      transition-all duration-200
                    `}
                  >
                    <p className="leading-relaxed">{message.text}</p>
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
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-zinc-100 dark:bg-zinc-900 rounded-full px-4 py-2 animate-pulse">
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <form onSubmit={sendMessage} className="border-t p-4 bg-background/50">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              placeholder="Напишете съобщение..."
              className="flex-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border-none focus-visible:ring-primary/20 px-4"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!newMessage.trim()}
              className="rounded-full hover:shadow-md transition-all"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
      <audio ref={audioRef} src="/notification.wav" />
    </Card>
  );
}