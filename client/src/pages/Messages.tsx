import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
  orderBy,
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
import { Loader2, MessageCircle } from "lucide-react";

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

  useEffect(() => {
    if (!user) return;

    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      try {
        const chatsPromises = snapshot.docs.map(async (chatDoc) => {
          const chatData = chatDoc.data() as ChatPreview;
          chatData.id = chatDoc.id;

          if (chatData.ownerId) {
            try {
              const ownerDoc = await getDoc(doc(db, "users", chatData.ownerId));
              if (ownerDoc.exists()) {
                chatData.ownerDetails = ownerDoc.data();
              }
            } catch (error) {
              console.error("Error fetching owner:", error);
            }
          }

          if (chatData.requesterId) {
            try {
              const requesterDoc = await getDoc(
                doc(db, "users", chatData.requesterId)
              );
              if (requesterDoc.exists()) {
                chatData.requesterDetails = requesterDoc.data();
              }
            } catch (error) {
              console.error("Error fetching requester:", error);
            }
          }

          return chatData;
        });

        const resolvedChats = await Promise.all(chatsPromises);
        setChats(resolvedChats);
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
      <Card className="border-2 border-primary/20">
        <CardHeader className="border-b bg-primary/5">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Съобщения
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
                <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Все още нямате съобщения
                </p>
              </div>
            ) : (
              <div className="divide-y">
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
                        className={`hover:bg-accent/50 transition-colors relative p-4 ${
                          isUnread ? "bg-primary/5" : ""
                        }`}
                      >
                        {isUnread && (
                          <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-primary" />
                        )}
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 border-2 border-primary/20">
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
                                className={`font-medium truncate ${
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
                                className={`text-sm truncate ${
                                  isUnread
                                    ? "text-foreground font-medium"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {chat.lastMessage.senderId === user.uid
                                  ? "Вие: "
                                  : ""}
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