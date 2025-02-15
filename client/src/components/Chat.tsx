import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import EmojiPicker from "emoji-picker-react";
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
  arrayUnion,
  limit,
  where,
  setDoc
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, formatDistanceToNow } from "date-fns";
import { Send, Smile, Clock } from "lucide-react";
import { Link } from "wouter";

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
  parentId?: string;
  reactions?: { emoji: string; userId: string }[];
  replyTo?: {
    id: string;
    text: string;
    senderId: string;
  };
}

interface ChatProps {
  chatId: string;
}

const Chat: React.FC<ChatProps> = ({ chatId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [lastSeen, setLastSeen] = useState<any>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const lastPlayedRef = useRef(0);
  const initialLoadRef = useRef(true);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Effect for scrolling to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update user's last seen status
  useEffect(() => {
    if (!user) return;

    const updateLastSeen = async () => {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          lastSeen: serverTimestamp(),
          isOnline: true
        });
      } catch (error) {
        console.error("Error updating last seen:", error);
      }
    };

    updateLastSeen();

    // Set up presence system
    const userStatusRef = doc(db, "users", user.uid);

    // Update when user leaves/closes tab
    const onOffline = async () => {
      try {
        await updateDoc(userStatusRef, {
          isOnline: false,
          lastSeen: serverTimestamp()
        });
      } catch (error) {
        console.error("Error updating offline status:", error);
      }
    };

    window.addEventListener('beforeunload', onOffline);

    return () => {
      window.removeEventListener('beforeunload', onOffline);
      onOffline();
    };
  }, [user]);

  // Monitor other user's status
  useEffect(() => {
    if (!otherUser?.userId) return;

    const userStatusRef = doc(db, "users", otherUser.userId);
    const unsubscribe = onSnapshot(userStatusRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setLastSeen(data.lastSeen);
      }
    });

    return () => unsubscribe();
  }, [otherUser]);

  // Effect for messages and typing indicator
  useEffect(() => {
    if (!user) return;

    const fetchChatData = async () => {
      try {
        const chatDoc = await getDoc(doc(db, "chats", chatId));
        if (chatDoc.exists()) {
          const data = chatDoc.data();
          const otherUserId = data.participants.find((id: string) => id !== user.uid);
          if (otherUserId) {
            const userDoc = await getDoc(doc(db, "users", otherUserId));
            if (userDoc.exists()) {
              setOtherUser({ userId: otherUserId, ...userDoc.data() });
            }
          }
        }
      } catch (error) {
        console.error("Error fetching chat data:", error);
      }
    };

    fetchChatData();

    const messagesQuery = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );

    const typingQuery = query(
      collection(db, "chats", chatId, "typing"),
      where("userId", "==", otherUser?.userId)
    );

    const messagesUnsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      try {
        const newMessages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }) as Message);
        setMessages(newMessages);

        // Play sound for new messages
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && 
            !initialLoadRef.current &&
            lastMessage.senderId !== user.uid && 
            lastMessage.createdAt?.toMillis() > lastPlayedRef.current) {
          audioRef.current?.play().catch(() => {});
          lastPlayedRef.current = lastMessage.createdAt?.toMillis() || Date.now();
        }

        initialLoadRef.current = false;
      } catch (error) {
        console.error("Error processing messages:", error);
      }
    });

    const typingUnsubscribe = onSnapshot(typingQuery, (snapshot) => {
      if (!snapshot.empty) {
        const typingData = snapshot.docs[0].data();
        setIsTyping(Date.now() - typingData.timestamp.toMillis() < 5000);
      } else {
        setIsTyping(false);
      }
    });

    return () => {
      messagesUnsubscribe();
      typingUnsubscribe();
      initialLoadRef.current = true;
    };
  }, [chatId, user, otherUser]);

  const handleTyping = async () => {
    if (!user || !otherUser) return;

    try {
      const typingRef = doc(db, "chats", chatId, "typing", user.uid);
      await setDoc(typingRef, {
        userId: user.uid,
        timestamp: serverTimestamp()
      }, { merge: true });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(async () => {
        await updateDoc(typingRef, {
          timestamp: new Date(0)
        });
      }, 5000);
    } catch (error) {
      console.error("Error updating typing status:", error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    try {
      const messageData = {
        text: newMessage.trim(),
        senderId: user.uid,
        createdAt: serverTimestamp(),
        ...(replyTo && {
          replyTo: {
            id: replyTo.id,
            text: replyTo.text,
            senderId: replyTo.senderId
          }
        })
      };

      await addDoc(collection(db, "chats", chatId, "messages"), messageData);

      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: messageData,
        updatedAt: serverTimestamp(),
        [`readBy.${user.uid}`]: serverTimestamp(),
      });

      setNewMessage("");
      setReplyTo(null);
      inputRef.current?.focus();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const getLastSeenText = () => {
    if (!lastSeen) return "Offline";
    if (lastSeen.toMillis() > Date.now() - 60000) return "Online";
    return `Last seen ${formatDistanceToNow(lastSeen.toDate(), { addSuffix: true })}`;
  };

  if (!user) return null;

  return (
    <Card className="overflow-hidden border-none shadow-lg bg-white dark:bg-zinc-950">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {otherUser && (
              <>
                <Avatar className="h-10 w-10 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                  <AvatarImage src={otherUser.photoURL} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {otherUser.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Link
                    href={`/user/${otherUser.userId}`}
                    className="hover:text-primary transition-colors block"
                  >
                    <span className="font-medium">
                      {otherUser.username || "User Not Found"}
                    </span>
                  </Link>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {getLastSeenText()}
                  </span>
                </div>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px] px-4 py-6">
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
                      ${
                        isSender
                          ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-md"
                          : "bg-zinc-100 dark:bg-zinc-900 shadow-sm"
                      }
                      transition-all duration-200
                      group relative
                    `}
                  >
                    {message.replyTo && (
                      <div className={`
                        text-sm rounded-lg p-2 mb-2
                        ${isSender 
                          ? "bg-primary-foreground/10" 
                          : "bg-background/50 dark:bg-background/10"
                        }
                      `}>
                        <p className="text-xs opacity-70">
                          Replying to {message.replyTo.senderId === user?.uid ? "yourself" : otherUser?.username}
                        </p>
                        <p className="truncate">{message.replyTo.text}</p>
                      </div>
                    )}

                    <p className="leading-relaxed">{message.text}</p>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p
                        className={`text-xs ${
                          isSender
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground"
                        }`}
                      >
                        {message.createdAt &&
                          format(message.createdAt.toDate(), "HH:mm")}
                      </p>
                      <div className="flex items-center gap-2">
                        {message.reactions && message.reactions.length > 0 && (
                          <div className="flex -space-x-1">
                            {message.reactions.map((reaction, index) => (
                              <div
                                key={index}
                                className="bg-background rounded-full p-1 shadow-sm text-sm"
                              >
                                {reaction.emoji}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-zinc-100 dark:bg-zinc-900 rounded-full px-4 py-2 animate-pulse">
                  <div className="flex items-center space-x-1">
                    <div
                      className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        <form onSubmit={sendMessage} className="border-t p-4 bg-background/50">
          {replyTo && (
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-1 h-8 bg-primary/20 rounded-full" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    Replying to {replyTo.senderId === user?.uid ? "yourself" : otherUser?.username}
                  </p>
                  <p className="text-sm truncate">{replyTo.text}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setReplyTo(null)}
              >
                ✕
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                placeholder="Напишете съобщение..."
                className="rounded-full bg-zinc-100 dark:bg-zinc-900 border-none focus-visible:ring-primary/20 pl-10 pr-4"
              />
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1 h-8 w-8"
                  >
                    <Smile className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-full" side="top">
                  <EmojiPicker
                    onEmojiClick={(emojiData: any) => {
                      setNewMessage((prev) => prev + emojiData.emoji);
                      setShowEmojiPicker(false);
                    }}
                    width={350}
                    height={400}
                  />
                </PopoverContent>
              </Popover>
            </div>
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
    </Card>
  );
};

export default Chat;