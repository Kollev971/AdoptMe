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
  getDocs
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Loader2, MessageCircle, MessageSquareMore } from "lucide-react";

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

  // Fetch user details in batch
  const fetchUserDetails = async (userIds: string[]) => {
    const uniqueIds = [...new Set(userIds)];
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

        // Collect all user IDs first
        chatDocs.forEach(doc => {
          const data = doc.data();
          if (data.ownerId) userIds.add(data.ownerId);
          if (data.requesterId) userIds.add(data.requesterId);
        });

        // Fetch all user details at once
        const userDetails = await fetchUserDetails([...userIds]);

        // Map chats with user details
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

    return () => unsubscribe();
  }, [user]);

  if (!user) return null;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="overflow-hidden border-none shadow-lg bg-white dark:bg-zinc-950">
        <CardHeader className="border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10">
          <CardTitle className="flex items-center gap-2">
            <MessageSquareMore className="w-5 h-5 text-primary" />
            <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Съобщения
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[70vh]">
            {loading ? (
              <div className="flex justify-center p-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Все още нямате съобщения
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {chats.map((chat) => {
                  const isOwner = user.uid === chat.ownerId;
                  const otherUser = isOwner
                    ? chat.requesterDetails
                    : chat.ownerDetails;
                  const isUnread =
                    chat.lastMessage?.senderId !== user.uid &&
                    (!chat.readBy?.[user.uid] ||
                      (chat.readBy[user.uid] &&
                        chat.lastMessage?.createdAt &&
                        new Date(chat.readBy[user.uid].seconds * 1000) <
                          new Date(chat.lastMessage.createdAt.seconds * 1000)));

                  return (
                    <Link key={chat.id} href={`/chat/${chat.id}`}>
                      <div
                        className={`
                          group relative p-4 
                          hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent
                          dark:hover:from-primary/10 dark:hover:to-transparent
                          transition-all duration-300
                          ${isUnread ? "bg-primary/5 dark:bg-primary/10" : ""}
                        `}
                      >
                        {isUnread && (
                          <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-primary animate-pulse" />
                        )}
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 ring-2 ring-primary/20 ring-offset-2 ring-offset-background transition-all duration-300 group-hover:ring-primary/40">
                            {otherUser?.photoURL ? (
                              <AvatarImage
                                src={otherUser.photoURL}
                                alt={otherUser.username || otherUser.fullName}
                              />
                            ) : (
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {(
                                  otherUser?.username ||
                                  otherUser?.fullName ||
                                  "?"
                                )
                                  .charAt(0)
                                  .toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <p
                                className={`font-medium truncate transition-colors ${
                                  isUnread ? "text-primary" : ""
                                }`}
                              >
                                {otherUser?.username ||
                                  otherUser?.fullName ||
                                  "Непознат потребител"}
                              </p>
                              {chat.lastMessage?.createdAt && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  {format(
                                    new Date(
                                      chat.lastMessage.createdAt.seconds * 1000
                                    ),
                                    "HH:mm"
                                  )}
                                </span>
                              )}
                            </div>
                            {chat.lastMessage && (
                              <p
                                className={`text-sm truncate transition-colors ${
                                  isUnread
                                    ? "text-foreground font-medium"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {chat.lastMessage.senderId === user.uid && (
                                  <span className="text-primary/80">Вие: </span>
                                )}
                                {chat.lastMessage.text}
                              </p>
                            )}
                          </div>
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