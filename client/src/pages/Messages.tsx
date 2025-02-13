import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Loader2, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: any;
  };
  participantDetails?: Record<string, {
    username: string;
    email: string;
    photoURL?: string;
  }>;
  listingDetails?: any;
}

export default function Messages() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessage.timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      const chatsData: Chat[] = [];

      for (const doc of snapshot.docs) {
        const chatData = { id: doc.id, ...doc.data() } as Chat;
        chatData.participantDetails = {};

        // Get participant details
        for (const participantId of chatData.participants) {
          if (participantId !== user.uid) {
            const userDoc = await db.collection('users').doc(participantId).get();
            if (userDoc.exists()) {
              chatData.participantDetails[participantId] = userDoc.data();
            }
          }
        }
        chatsData.push(chatData);
      }

      setChats(chatsData);
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
              const otherUserId = chat.participants.find(id => id !== user.uid);
              const otherUserDetails = otherUserId ? chat.participantDetails?.[otherUserId] : undefined;

              return (
                <Card 
                  key={chat.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setLocation(`/chat/${chat.id}`)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar>
                      {otherUserDetails?.photoURL ? (
                        <AvatarImage src={otherUserDetails.photoURL} alt={otherUserDetails.username} />
                      ) : (
                        <AvatarFallback>
                          {otherUserDetails?.username?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <div>
                        <p className="font-medium">{otherUserDetails?.username || 'Непознат потребител'}</p>
                        {chat.listingDetails?.title && (
                          <p className="text-sm text-muted-foreground">Относно: {chat.listingDetails.title}</p>
                        )}
                      </div>
                      {chat.lastMessage ? (
                        <>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {chat.lastMessage.senderId === user.uid ? 'Вие: ' : ''}{chat.lastMessage.text}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(chat.lastMessage.timestamp?.toDate()), 'dd/MM/yyyy HH:mm')}
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