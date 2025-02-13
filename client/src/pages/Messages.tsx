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
  lastMessage: {
    text: string;
    senderId: string;
    createdAt: any;
  };
  listingId: string;
  listingTitle: string;
  ownerId: string;
  requesterId: string;
  ownerDetails?: any;
  requesterDetails?: any;
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
      orderBy("lastMessage.createdAt", "desc")
    );

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      const chatsData: ChatPreview[] = [];

      const promises = snapshot.docs.map(async (doc) => {
        const chatData = doc.data();

        // Fetch listing details
        let listingTitle = "Непознато животно";
        if (chatData.listingId) {
          const listingDoc = await getDoc(doc.ref.parent.parent!.collection('listings').doc(chatData.listingId));
          if (listingDoc.exists()) {
            listingTitle = listingDoc.data().title;
          }
        }

        // Fetch user details
        const [ownerDoc, requesterDoc] = await Promise.all([
          getDoc(doc.ref.parent.parent!.collection('users').doc(chatData.ownerId)),
          getDoc(doc.ref.parent.parent!.collection('users').doc(chatData.requesterId))
        ]);

        return {
          id: doc.id,
          ...chatData,
          listingTitle,
          ownerDetails: ownerDoc.exists() ? ownerDoc.data() : null,
          requesterDetails: requesterDoc.exists() ? requesterDoc.data() : null,
        };
      });

      const resolvedChats = await Promise.all(promises);
      setChats(resolvedChats);
      setLoading(false);
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
                              <AvatarImage src={otherUser.photoURL} alt={otherUser.fullName || otherUser.email} />
                            ) : (
                              <AvatarFallback>
                                {(otherUser?.fullName || otherUser?.email || "?").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <p className="font-medium truncate">
                                {otherUser?.fullName || otherUser?.email || "Непознат потребител"}
                              </p>
                              {chat.lastMessage?.createdAt && (
                                <span className="text-xs text-muted-foreground">
                                  {format(chat.lastMessage.createdAt.toDate(), "HH:mm")}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              Относно: {chat.listingTitle}
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