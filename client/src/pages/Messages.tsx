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
}

export default function Messages() {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Query for chats where the user is a participant
    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      try {
        const chatsPromises = snapshot.docs.map(async (chatDoc) => {
          const chatData = chatDoc.data();

          // Get listing details
          let listingDetails = null;
          if (chatData.listingId) {
            try {
              const listingDoc = await getDoc(doc(db, "listings", chatData.listingId));
              if (listingDoc.exists()) {
                listingDetails = listingDoc.data();
              }
            } catch (error) {
              console.error("Error fetching listing:", error);
            }
          }

          // Get owner details
          let ownerDetails = null;
          if (chatData.ownerId) {
            try {
              const ownerDoc = await getDoc(doc(db, "users", chatData.ownerId));
              if (ownerDoc.exists()) {
                ownerDetails = ownerDoc.data();
              }
            } catch (error) {
              console.error("Error fetching owner:", error);
            }
          }

          // Get requester details
          let requesterDetails = null;
          if (chatData.requesterId) {
            try {
              const requesterDoc = await getDoc(doc(db, "users", chatData.requesterId));
              if (requesterDoc.exists()) {
                requesterDetails = requesterDoc.data();
              }
            } catch (error) {
              console.error("Error fetching requester:", error);
            }
          }

          return {
            id: chatDoc.id,
            ...chatData,
            listingDetails,
            ownerDetails,
            requesterDetails,
          };
        });

        const resolvedChats = await Promise.all(chatsPromises);
        console.log("Fetched chats:", resolvedChats); // Debug log
        setChats(resolvedChats);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching chats:", error);
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