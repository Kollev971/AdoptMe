import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useLocation } from "wouter";
import { database } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Chat as ChatComponent } from "@/components/Chat";

interface ChatRoom {
  participants: { [key: string]: boolean };
  participantEmails?: { [key: string]: string };
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: number;
  };
}

export default function Chat() {
  const { user } = useAuth();
  const { chatId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(true);

  // Verify chat access
  useEffect(() => {
    if (!chatId || !user) return;

    const chatRef = ref(database, `chats/${chatId}`);
    const unsubscribe = onValue(chatRef, (snapshot) => {
      if (!snapshot.exists()) {
        toast({
          title: "Грешка",
          description: "Чатът не съществува",
          variant: "destructive",
        });
        setLocation("/messages");
        return;
      }

      const chatData = snapshot.val() as ChatRoom;
      if (!chatData.participants[user.uid]) {
        toast({
          title: "Грешка",
          description: "Нямате достъп до този чат",
          variant: "destructive",
        });
        setLocation("/messages");
        return;
      }

      setChatRoom(chatData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId, user]);

  if (!user || !chatId) {
    setLocation("/messages");
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Зареждане на чата...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 h-screen flex flex-col">
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle>Чат</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <ChatComponent chatId={chatId} />
        </CardContent>
      </Card>
    </div>
  );
}