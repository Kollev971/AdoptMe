import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ref, query, orderByChild, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Loader2, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Chat {
  id: string;
  participants: Record<string, boolean>;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: number;
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

    const chatsRef = ref(database, 'chats');
    const chatsQuery = query(chatsRef, orderByChild(`participants/${user.uid}`));

    const unsubscribe = onValue(chatsQuery, (snapshot) => {
      const chatsData: Chat[] = [];
      snapshot.forEach((childSnapshot) => {
        const chatData = childSnapshot.val();
        if (chatData.participants[user.uid]) {
          const otherUserId = Object.keys(chatData.participants).find(id => id !== user.uid);
          chatsData.push({
            id: childSnapshot.key!,
            ...chatData,
            otherUser: otherUserId ? {
              id: otherUserId,
              email: chatData.participantEmails?.[otherUserId] || 'Unknown User'
            } : undefined
          });
        }
      });

      setChats(chatsData.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp || 0;
        const timeB = b.lastMessage?.timestamp || 0;
        return timeB - timeA;
      }));
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