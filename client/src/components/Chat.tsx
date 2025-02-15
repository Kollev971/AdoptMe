import { useEffect, useRef, useState } from "react";
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
  setDoc,
  Timestamp,
  arrayUnion,
  limit,
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Send, Smile } from "lucide-react";
import { Link } from "wouter";

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Timestamp;
  reactions?: { emoji: string; userId: string }[];
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const lastPlayedRef = useRef<number>(0);
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

  // Fetch messages and handle real-time updates
  useEffect(() => {
    if (!user) return;

    const messagesQuery = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        try {
          const newMessages = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }) as Message);
          setMessages(newMessages);

          // Play sound only for new messages from other user and not on initial load
          const lastMessage = newMessages[newMessages.length - 1];
          if (
            lastMessage &&
            !initialLoadRef.current &&
            lastMessage.senderId !== user.uid &&
            lastMessage.createdAt?.toMillis() > lastPlayedRef.current
          ) {
            audioRef.current?.play().catch(() => {});
            lastPlayedRef.current = lastMessage.createdAt?.toMillis() || Date.now();
          }

          // Mark chat as read
          if (lastMessage && lastMessage.senderId !== user.uid) {
            updateDoc(doc(db, "chats", chatId), {
              [`readBy.${user.uid}`]: serverTimestamp(),
            }).catch((error) => {
              console.error("Error updating readBy:", error);
            });
          }

          initialLoadRef.current = false;
        } catch (error) {
          console.error("Error processing messages:", error);
        }
      },
      (error) => {
        console.error("Messages listener error:", error);
      }
    );

    return () => {
      unsubscribe();
      initialLoadRef.current = true;
    };
  }, [chatId, user]);

  // Fetch chat details and other user info
  useEffect(() => {
    const fetchChatData = async () => {
      if (!user) return;

      try {
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
      } catch (error) {
        console.error("Error fetching chat data:", error);
      }
    };

    fetchChatData();
  }, [chatId, user]);

  // Handle typing indicator
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
      const messageData = {
        text: newMessage.trim(),
        senderId: user.uid,
        createdAt: serverTimestamp(),
      };

      // Add message to messages collection
      await addDoc(collection(db, "chats", chatId, "messages"), messageData);

      // Update last message in chat document
      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: messageData,
        updatedAt: serverTimestamp(),
        [`readBy.${user.uid}`]: serverTimestamp(),
      });

      setNewMessage("");
      inputRef.current?.focus();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleEmojiSelect = (emojiData: any) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    try {
      const messageRef = doc(db, "chats", chatId, "messages", messageId);
      await updateDoc(messageRef, {
        reactions: arrayUnion({
          emoji,
          userId: user.uid,
          timestamp: serverTimestamp()
        })
      });
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  };

  return (
    <Card className="overflow-hidden border-none shadow-lg bg-white dark:bg-zinc-950">
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
              <Link
                href={`/user/${otherUser.userId}`}
                className="hover:text-primary transition-colors"
              >
                <span className="font-medium">
                  {otherUser.username || "User Not Found"}
                </span>
              </Link>
            </>
          )}
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
                    <p className="leading-relaxed">{message.text}</p>
                    {!isSender && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 absolute -right-10 top-2 p-2 h-8 w-8"
                          >
                            <Smile className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-full" side="right">
                          <EmojiPicker
                            onEmojiClick={(emojiData) => {
                              addReaction(message.id, emojiData.emoji);
                            }}
                            width={300}
                            height={400}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
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
                        {isSender && (
                          <span 
                            className={`text-xs ${
                              message.read 
                                ? "text-primary-foreground/80" 
                                : "text-primary-foreground/40"
                            }`}
                          >
                            {message.read ? (
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </span>
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
                    onEmojiClick={handleEmojiSelect}
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
      <audio ref={audioRef} preload="auto">
        <source src="/notification.wav" type="audio/wav" />
      </audio>
    </Card>
  );
}