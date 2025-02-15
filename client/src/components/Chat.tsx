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
  const audioRef = useRef<HTMLAudioElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const lastMessageRef = useRef<string | null>(null);

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

      if (
        newMessages.length > 0 &&
        newMessages[newMessages.length - 1].senderId !== user.uid
      ) {
        audioRef.current?.play().catch(() => {});
      }

      // Скролваме само ако последното съобщение е наше
      const lastMessage = newMessages[newMessages.length - 1];
      if (lastMessage && lastMessage.senderId === user.uid && lastMessageRef.current !== lastMessage.id) {
        scrollToBottom();
        lastMessageRef.current = lastMessage.id;
      }
    });

    // Следим за typing индикатора
    const typingRef = doc(db, `chats/${chatId}/typing/${otherUser?.userId}`);
    const typingUnsubscribe = onSnapshot(typingRef, (doc) => {
      if (doc.exists()) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    });

    return () => {
      unsubscribe();
      typingUnsubscribe();
    };
  }, [chatId, user, otherUser]);

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
      // Запазваме фокуса на input полето
      inputRef.current?.focus();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      const messageRef = doc(db, "chats", chatId, "messages", messageId);
      await updateDoc(messageRef, { read: true });
    } catch (error) {
      console.error("Error marking message as read:", error);
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
                <span>{otherUser.username || "User Not Found"}</span>
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
              const isUnread = !message.read && !isSender;

              if (isUnread) {
                markMessageAsRead(message.id);
              }

              return (
                <div
                  key={message.id}
                  className={`flex ${isSender ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] break-words rounded-lg p-3 ${
                      isSender 
                        ? "bg-primary text-primary-foreground" 
                        : isUnread
                          ? "bg-blue-50 dark:bg-blue-900/20"
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
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">Пише съобщение...</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <form onSubmit={sendMessage} className="border-t p-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
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