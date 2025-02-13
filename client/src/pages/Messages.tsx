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
import { Loader2 } from "lucide-react";

interface ChatPreview {
  id: string;
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: any;
  };
  listingId: string;
  ownerId: string;
  requesterId: string;
  listingDetails?: any;
  ownerDetails?: any;
  requesterDetails?: any;
  participants: string[];
  updatedAt: any;
}

export default function Messages() {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    console.log("Current user ID:", user.uid);

    // Query for chats where the user is a participant
    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      try {
        console.log("Chats snapshot received:", snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })));

        const chatsPromises = snapshot.docs.map(async (chatDoc) => {
          const chatData = chatDoc.data() as ChatPreview;
          chatData.id = chatDoc.id;
          console.log("Processing chat:", chatDoc.id, chatData);

          // Fetch listing details
          if (chatData.listingId) {
            try {
              const listingDoc = await getDoc(doc(db, "listings", chatData.listingId));
              console.log("Listing details for chat:", chatDoc.id, listingDoc.data());
              if (listingDoc.exists()) {
                chatData.listingDetails = listingDoc.data();
              }
            } catch (error) {
              console.error("Error fetching listing:", error);
            }
          }

          // Fetch owner details
          if (chatData.ownerId) {
            try {
              const ownerDoc = await getDoc(doc(db, "users", chatData.ownerId));
              console.log("Owner details for chat:", chatDoc.id, ownerDoc.data());
              if (ownerDoc.exists()) {
                chatData.ownerDetails = ownerDoc.data();
              }
            } catch (error) {
              console.error("Error fetching owner:", error);
            }
          }

          // Fetch requester details
          if (chatData.requesterId) {
            try {
              const requesterDoc = await getDoc(doc(db, "users", chatData.requesterId));
              console.log("Requester details for chat:", chatDoc.id, requesterDoc.data());
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
        console.log("Final resolved chats:", resolvedChats);
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
      <Card>
        <CardHeader>
          <CardTitle>Съобщения</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[70vh]">
            {loading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : chats.length === 0 ? (
              <p className="text-center text-muted-foreground">
                Нямате съобщения
              </p>
            ) : (
              <div className="space-y-2">
                {chats.map((chat) => {
                  const isOwner = user.uid === chat.ownerId;
                  const otherUser = isOwner ? chat.requesterDetails : chat.ownerDetails;
                  console.log("Rendering chat:", {
                    chatId: chat.id,
                    isOwner,
                    otherUser,
                    currentUser: user.uid,
                    ownerId: chat.ownerId,
                    requesterId: chat.requesterId
                  });

                  return (
                    <Link key={chat.id} href={`/chat/${chat.id}`}>
                      <Card className="cursor-pointer hover:bg-accent transition-colors">
                        <CardContent className="p-4 flex items-center gap-4">
                          <Avatar>
                            {otherUser?.photoURL ? (
                              <AvatarImage src={otherUser.photoURL} alt={otherUser.displayName || otherUser.email} />
                            ) : (
                              <AvatarFallback>
                                {(otherUser?.displayName || otherUser?.email || "?").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <p className="font-medium truncate">
                                {otherUser?.displayName || otherUser?.email || "Непознат потребител"}
                              </p>
                              {chat.lastMessage?.createdAt && (
                                <span className="text-xs text-muted-foreground">
                                  {format(chat.lastMessage.createdAt.toDate(), "HH:mm")}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              Относно: {chat.listingDetails?.title || "Непознато животно"}
                            </p>
                            {chat.lastMessage && (
                              <p className="text-sm truncate">
                                {chat.lastMessage.senderId === user.uid ? "Вие: " : ""}
                                {chat.lastMessage.text}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
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