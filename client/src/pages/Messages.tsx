
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { database } from "@/lib/firebase";
import { ref, query, orderByChild, onValue } from "firebase/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Loader2, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface Chat {
  id: string;
  participants: Record<string, boolean>;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: number;
  };
  participantEmails?: Record<string, string>;
}

export default function Messages() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [lastMessageTimestamps, setLastMessageTimestamps] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;

    const chatsRef = ref(database, 'chats');
    const chatsQuery = query(chatsRef, orderByChild(`participants/${user.uid}`));

    const unsubscribe = onValue(chatsQuery, (snapshot) => {
      const chatsData: Chat[] = [];
      snapshot.forEach((childSnapshot) => {
        const chatData = childSnapshot.val();
        if (chatData.participants[user.uid]) {
          chatsData.push({
            id: childSnapshot.key!,
            ...chatData
          });

          // Check for new messages
          if (chatData.lastMessage) {
            const lastTimestamp = lastMessageTimestamps[childSnapshot.key!] || 0;
            if (chatData.lastMessage.timestamp > lastTimestamp && chatData.lastMessage.senderId !== user.uid) {
              toast({
                title: "Ново съобщение",
                description: `${chatData.participantEmails[chatData.lastMessage.senderId]}: ${chatData.lastMessage.text}`,
                duration: 5000,
              });
              setLastMessageTimestamps(prev => ({
                ...prev,
                [childSnapshot.key!]: chatData.lastMessage.timestamp
              }));
            }
          }
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
  }, [user, toast, lastMessageTimestamps]);

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
            {chats.map((chat) => {
              const otherUserId = Object.keys(chat.participants).find(id => id !== user?.uid);
              const otherUserEmail = otherUserId ? chat.participantEmails?.[otherUserId] : 'Непознат потребител';

              return (
                <Card 
                  key={chat.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setLocation(`/chat/${chat.id}`)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>
                        {otherUserEmail?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{otherUserEmail}</p>
                      {chat.lastMessage ? (
                        <>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {chat.lastMessage.senderId === user?.uid ? 'Вие: ' : ''}{chat.lastMessage.text}
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
              );
            })}
            {chats.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Нямате съобщения</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
