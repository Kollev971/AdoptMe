
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface Chat {
  id: string;
  participants: Record<string, boolean>;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: string;
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

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Chat));
      setChats(chatsData);
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
          <CardTitle>Съобщения</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {chats.map((chat) => (
              <Card 
                key={chat.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setLocation(`/chat/${chat.id}`)}
              >
                <CardContent className="p-4">
                  {chat.lastMessage ? (
                    <>
                      <p className="font-medium">{chat.lastMessage.text}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(chat.lastMessage.timestamp).toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Няма съобщения</p>
                  )}
                </CardContent>
              </Card>
            ))}
            {chats.length === 0 && (
              <p className="text-center text-muted-foreground">Нямате съобщения</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
