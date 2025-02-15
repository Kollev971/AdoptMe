import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  orderBy,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { MessageCircle, MessageSquareMore, Loader2 } from "lucide-react";
import { playMessageNotification, markMessagesAsRead } from "@/lib/firebase";

interface ChatPreview {
  id: string;
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: any;
  };
  ownerId: string;
  requesterId: string;
  ownerDetails?: any;
  requesterDetails?: any;
  participants: string[];
  updatedAt: any;
  readBy?: Record<string, any>;
}

export default function Messages() {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [userDetailsCache, setUserDetailsCache] = useState<Record<string, any>>({});
  const [lastNotificationTime, setLastNotificationTime] = useState(Date.now());

  const fetchUserDetails = async (userIds: string[]) => {
    const uniqueIds = Array.from(new Set(userIds));
    const newCache: Record<string, any> = { ...userDetailsCache };
    const idsToFetch = uniqueIds.filter(id => !userDetailsCache[id]);

    if (idsToFetch.length > 0) {
      const userDocs = await Promise.all(
        idsToFetch.map(id => getDoc(doc(db, "users", id)))
      );

      userDocs.forEach((doc, index) => {
        if (doc.exists()) {
          newCache[idsToFetch[index]] = doc.data();
        }
      });

      setUserDetailsCache(newCache);
    }

    return newCache;
  };

  useEffect(() => {
    if (!user) return;

    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      try {
        const chatDocs = snapshot.docs;
        const userIds = new Set<string>();
        const currentTime = Date.now();
        let newMessageReceived = false;

        // Gather all user IDs and check for new messages
        chatDocs.forEach(doc => {
          const data = doc.data();
          if (data.ownerId) userIds.add(data.ownerId);
          if (data.requesterId) userIds.add(data.requesterId);

          // Check if there's a new unread message that's newer than our last notification
          if (data.lastMessage && 
              data.lastMessage.senderId !== user.uid && 
              data.lastMessage.createdAt?.toDate().getTime() > lastNotificationTime) {
            newMessageReceived = true;
          }
        });

        // Play notification sound if new message is received
        if (newMessageReceived) {
          playMessageNotification();
          setLastNotificationTime(currentTime);
        }

        const userDetails = await fetchUserDetails(Array.from(userIds));

        const processedChats = chatDocs.map(doc => {
          const chatData = doc.data() as ChatPreview;
          chatData.id = doc.id;

          if (chatData.ownerId) {
            chatData.ownerDetails = userDetails[chatData.ownerId];
          }
          if (chatData.requesterId) {
            chatData.requesterDetails = userDetails[chatData.requesterId];
          }

          return chatData;
        });

        setChats(processedChats);
        setLoading(false);
      } catch (error) {
        console.error("Error processing chats:", error);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user, lastNotificationTime]);

  if (!user) return null;

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card className="bg-white/50 backdrop-blur-lg border-none shadow-xl dark:bg-zinc-900/50">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            <MessageSquareMore className="w-6 h-6 text-primary" />
            Messages
          </h2>
        </div>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-12rem)]">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <MessageCircle className="w-12 h-12 text-zinc-400 dark:text-zinc-600 mb-4" />
                <p className="text-zinc-600 dark:text-zinc-400">No messages yet</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {chats.map((chat) => {
                  const isOwner = user.uid === chat.ownerId;
                  const otherUser = isOwner ? chat.requesterDetails : chat.ownerDetails;
                  const isUnread = chat.lastMessage && 
                    chat.lastMessage.senderId !== user.uid && 
                    (!chat.readBy?.[user.uid] || 
                      (chat.readBy[user.uid] && 
                       chat.lastMessage.createdAt?.toDate() > chat.readBy[user.uid]?.toDate()));

                  return (
                    <Link key={chat.id} href={`/chat/${chat.id}`} onClick={() => {
                      if (user && isUnread) {
                        markMessagesAsRead(chat.id, user.uid).catch(console.error);
                      }
                    }}>
                      <div className={`
                        relative p-4 transition-all duration-200
                        hover:bg-zinc-50 dark:hover:bg-zinc-800/50
                        ${isUnread ? 'bg-primary/5 dark:bg-primary/10' : ''}
                      `}>
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                            {otherUser?.photoURL ? (
                              <AvatarImage src={otherUser.photoURL} />
                            ) : (
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {otherUser?.username?.[0]?.toUpperCase() || "?"}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <p className={`font-medium truncate ${isUnread ? 'text-primary' : ''}`}>
                                {otherUser?.username || "Unknown User"}
                              </p>
                              {chat.lastMessage?.createdAt && (
                                <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-2">
                                  {format(chat.lastMessage.createdAt.toDate(), "HH:mm")}
                                </span>
                              )}
                            </div>
                            {chat.lastMessage && (
                              <p className={`text-sm truncate ${
                                isUnread ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-600 dark:text-zinc-400'
                              }`}>
                                {chat.lastMessage.senderId === user.uid && (
                                  <span className="text-primary">You: </span>
                                )}
                                {chat.lastMessage.text}
                              </p>
                            )}
                          </div>
                          {isUnread && (
                            <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-primary animate-pulse" />
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}