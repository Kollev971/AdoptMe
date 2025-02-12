
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { collection, query, where, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Loader2, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Chat {
  id: string;
  participants: Record<string, boolean>;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: string;
  };
  otherUser?: {
    id: string;
    email: string;
  };
}

export default function Messages() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) return;

    const chatsRef = collection(db, "chats");
    const q = query(
      chatsRef,
      where(`participants.${user.uid}`, "==", true),
      orderBy("lastMessage.timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatsPromises = snapshot.docs.map(async (doc) => {
        const chatData = doc.data();
        const otherUserId = Object.keys(chatData.participants).find(id => id !== user.uid);
        
        if (otherUserId) {
          const userDoc = await getDocs(query(collection(db, "users"), where("uid", "==", otherUserId)));
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            return {
              id: doc.id,
              ...chatData,
              otherUser: {
                id: otherUserId,
                email: userData.email,
              }
            } as Chat;
          }
        }
        return { id: doc.id, ...chatData } as Chat;
      });

      const resolvedChats = await Promise.all(chatsPromises);
      setChats(resolvedChats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Съобщения
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {chats.map((chat) => (
              <Card 
                key={chat.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setLocation(`/chat/${chat.id}`)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback>
                      {chat.otherUser?.email?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{chat.otherUser?.email || 'Потребител'}</p>
                    {chat.lastMessage ? (
                      <>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {chat.lastMessage.text}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(chat.lastMessage.timestamp).toLocaleString()}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Няма съобщения</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {chats.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Нямате съобщения</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
