
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { database } from "@/lib/firebase";
import { ref, query, orderByChild, onValue } from "firebase/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Loader2, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface Chat {
  id: string;
  participants: Record<string, boolean>;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: number;
  };
  participantDetails: Record<string, {
    email: string;
    photoURL?: string;
  }>;
}

export default function Messages() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const chatsRef = ref(database, 'chats');
    const unsubscribe = onValue(chatsRef, (snapshot) => {
      const chatsData: Chat[] = [];
      snapshot.forEach((childSnapshot) => {
        const chatData = childSnapshot.val();
        if (chatData.participants?.[user.uid]) {
          chatsData.push({
            id: childSnapshot.key!,
            ...chatData
          });
        }
      });

      setChats(chatsData.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp || 0;
        const timeB = b.lastMessage?.timestamp || 0;
        return timeB - timeA;
      }));
      setLoading(false);
    }, (error) => {
      console.error("Error loading chats:", error);
      toast({ 
        description: 'Грешка при зареждане на съобщенията: ' + error.message,
        variant: 'destructive'
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-8">
            <p className="text-center">Моля, влезте в профила си за да видите съобщенията.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
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
              const otherUserId = Object.keys(chat.participants).find(id => id !== user.uid);
              const otherUserDetails = otherUserId ? chat.participantDetails?.[otherUserId] : undefined;
              const listingDetails = chat.listingDetails || {};

              return (
                <Card 
                  key={chat.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setLocation(`/chat/${chat.id}`)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar>
                      {otherUserDetails?.photoURL ? (
                        <AvatarImage src={otherUserDetails.photoURL} alt={otherUserDetails.email} />
                      ) : (
                        <AvatarFallback>
                          {otherUserDetails?.email?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <div>
                        <p className="font-medium">{otherUserDetails?.email || 'Непознат потребител'}</p>
                        {listingDetails.title && (
                          <p className="text-sm text-muted-foreground">Относно: {listingDetails.title}</p>
                        )}
                      </div>
                      {chat.lastMessage ? (
                        <>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {chat.lastMessage.senderId === user.uid ? 'Вие: ' : ''}{chat.lastMessage.text}
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
