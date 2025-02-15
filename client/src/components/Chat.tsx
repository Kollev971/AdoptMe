import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { Smile, MessageCircle, Share2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
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
  Timestamp,
  setDoc
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
  const [notificationSound] = useState(new Audio("/notification.wav"));
  const [unreadCount, setUnreadCount] = useState(0);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [lastSeen, setLastSeen] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Function to update typing status
  const updateTypingStatus = async (typing: boolean) => {
    if (!user) return;

    const typingRef = doc(db, "chats", chatId, "typing", user.uid);
    await setDoc(typingRef, {
      isTyping: typing,
      timestamp: serverTimestamp()
    });
  };

  // Handle typing indicator
  useEffect(() => {
    if (!user || !chatId) return;

    // Listen for other user's typing status
    const otherUserTypingRef = query(
      collection(db, "chats", chatId, "typing")
    );

    const unsubscribe = onSnapshot(otherUserTypingRef, (snapshot) => {
      snapshot.docs.forEach((doc) => {
        if (doc.id !== user.uid) {
          const data = doc.data();
          setOtherUserTyping(data.isTyping);
        }
      });
    });

    return () => unsubscribe();
  }, [chatId, user]);

  // Update last seen status
  useEffect(() => {
    if (!user || !chatId) return;

    const updateLastSeen = async () => {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        lastSeen: serverTimestamp()
      });
    };

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [user, chatId]);

  // Listen for last seen status of other user
  useEffect(() => {
    if (!otherUser) return;

    const userRef = doc(db, "users", otherUser.userId);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setLastSeen(doc.data().lastSeen);
      }
    });

    return () => unsubscribe();
  }, [otherUser]);

  const markMessagesAsRead = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "chats", chatId), {
        [`readBy.${user.uid}`]: serverTimestamp()
      });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

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
      setUnreadCount(newMessages.filter(msg => !msg.readBy?.[otherUser?.userId]).length);

      // Update read status
      if (newMessages.length > 0) {
        await updateDoc(doc(db, "chats", chatId), {
          [`readBy.${user.uid}`]: serverTimestamp()
        });
      }
    });

    return () => unsubscribe();
  }, [chatId, user, otherUser]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing status to true
    updateTypingStatus(true);

    // Set new timeout to mark as not typing after 1.5 seconds
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 1500);
  };

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
      updateTypingStatus(false);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const getLastSeenText = () => {
    if (!lastSeen) return "Offline";
    const lastSeenDate = lastSeen.toDate();
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / 60000);

    if (diffInMinutes < 1) return "Online";
    if (diffInMinutes < 60) return `Last seen ${diffInMinutes} minutes ago`;
    return `Last seen ${format(lastSeenDate, "HH:mm")}`;
  };

  useEffect(() => {
    if (unreadCount > 0 && notificationSound) {
      notificationSound.play();
    }
  }, [unreadCount, notificationSound]);


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
              <div className="flex flex-col">
                <Link href={`/user/${otherUser.userId}`} className="hover:text-primary transition-colors">
                  <span className="font-semibold">{otherUser.username || "Unknown User"}</span>
                </Link>
                <span className="text-sm text-muted-foreground">
                  {otherUserTyping ? "Typing..." : getLastSeenText()}
                  {unreadCount > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </span>
              </div>
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
                  <div className={`
                      max-w-[70%] group relative
                      rounded-2xl p-3 shadow-sm
                      ${isSender 
                        ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground" 
                        : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                      }
                    `}>
                    <p className="break-words leading-relaxed">{message.text}</p>
                    <div className={`
                      flex items-center gap-1 text-xs mt-1.5
                      ${isSender 
                        ? "text-primary-foreground/90" 
                        : "text-muted-foreground"
                      }
                    `}>
                      <div className="flex items-center gap-1">
                        {message.createdAt && (
                          <span>
                            {format(message.createdAt.toDate(), "HH:mm")}
                          </span>
                        )}
                        {showRead && (
                          <span className="ml-1 tooltip-wrapper" title={isRead ? "Read" : "Sent"}>
                            {isRead && message.readBy?.[otherUser?.userId] ? (
                              <CheckCheck className="w-4 h-4 text-blue-400" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {otherUserTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="animate-bounce">•</div>
                    <div className="animate-bounce delay-100">•</div>
                    <div className="animate-bounce delay-200">•</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <form onSubmit={sendMessage} className="border-t border-zinc-200 dark:border-zinc-800 p-4 bg-white/50 backdrop-blur-lg dark:bg-zinc-900/50">
          <div className="flex gap-2 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Smile className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Picker 
                  data={data} 
                  onEmojiSelect={(emoji: any) => setNewMessage(prev => prev + emoji.native)}
                  theme="light"
                />
              </PopoverContent>
            </Popover>
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={handleInputChange}
              onFocus={markMessagesAsRead}
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