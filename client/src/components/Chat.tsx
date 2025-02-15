
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
  Timestamp
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Send, Check, CheckCheck } from "lucide-react";
import { Link } from "wouter";

interface ChatProps {
  chatId: string;
}

export default function ChatComponent({ chatId }: ChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollToBottom = () => {
      if (lastMessageRef.current) {
        lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
      }
    };

    scrollToBottom();
  }, [messages]);

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

      // Update read status
      if (newMessages.length > 0) {
        await updateDoc(doc(db, "chats", chatId), {
          [`readBy.${user.uid}`]: serverTimestamp()
        });
      }
    });

    return () => unsubscribe();
  }, [chatId, user]);

  useEffect(() => {
    const fetchChatData = async () => {
      if (!user) return;

      try {
        const chatRef = doc(db, "chats", chatId);
        const chatDoc = await getDoc(chatRef);
        
        if (chatDoc.exists()) {
          const chatData = chatDoc.data();
          const participants = Array.isArray(chatData.participants) 
            ? chatData.participants 
            : Object.keys(chatData.participants);
            
          const otherUserId = participants.find(
            (id: string) => id !== user.uid
          );

          if (otherUserId) {
            const userDoc = await getDoc(doc(db, "users", otherUserId));
            if (userDoc.exists()) {
              setOtherUser({
                userId: otherUserId,
                ...userDoc.data()
              });
            }
          }
        }
      } catch (error) {
        console.error("Error fetching chat data:", error);
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
    <Card className="border-none shadow-xl bg-white/50 backdrop-blur-lg dark:bg-zinc-900/50">
      <CardHeader className="border-b border-zinc-200 dark:border-zinc-800 bg-white/50 backdrop-blur-lg dark:bg-zinc-900/50">
        <CardTitle className="flex items-center gap-3">
          {otherUser && (
            <>
              <Avatar className="h-10 w-10 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                <AvatarImage src={otherUser.photoURL} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {otherUser.username?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <Link href={`/user/${otherUser.userId}`} className="hover:text-primary transition-colors">
                <span className="font-semibold">{otherUser.username || "Unknown User"}</span>
              </Link>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-12rem)] p-6">
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isSender = message.senderId === user?.uid;
              const isRead = message.readBy?.[otherUser?.userId];
              const showRead = isSender && index === messages.length - 1;

              return (
                <div
                  key={message.id}
                  className={`flex ${isSender ? "justify-end" : "justify-start"}`}
                  ref={index === messages.length - 1 ? lastMessageRef : null}
                >
                  <div
                    className={`
                      max-w-[70%] group relative
                      rounded-2xl p-3
                      ${isSender 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-zinc-100 dark:bg-zinc-800"
                      }
                    `}
                  >
                    <p className="break-words">{message.text}</p>
                    <div className={`
                      flex items-center gap-1 text-xs mt-1
                      ${isSender 
                        ? "text-primary-foreground/80" 
                        : "text-muted-foreground"
                      }
                    `}>
                      {message.createdAt && (
                        <span>
                          {format(message.createdAt.toDate(), "HH:mm")}
                        </span>
                      )}
                      {showRead && (
                        <span className="ml-1">
                          {isRead ? (
                            <CheckCheck className="w-4 h-4" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <form onSubmit={sendMessage} className="border-t border-zinc-200 dark:border-zinc-800 p-4 bg-white/50 backdrop-blur-lg dark:bg-zinc-900/50">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
