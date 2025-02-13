import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import ChatComponent from "@/components/Chat";

export default function ChatPage() {
  const [, params] = useRoute("/chat/:chatId");
  const { user } = useAuth();
  const { toast } = useToast();
  const [chatData, setChatData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.chatId || !user) return;

    const fetchChatData = async () => {
      try {
        const chatDoc = await getDoc(doc(db, "chats", params.chatId));

        if (!chatDoc.exists()) {
          toast({
            description: "Този чат не съществува.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const data = chatDoc.data();
        // Check if user is part of the chat
        const isParticipant = data.participants?.includes(user.uid);

        if (!isParticipant) {
          toast({
            description: "Нямате достъп до този чат.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        setChatData(data);
        setLoading(false);
      } catch (error: any) {
        console.error("Error fetching chat:", error);
        toast({
          description: "Грешка при зареждане на чата: " + error.message,
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    fetchChatData();
  }, [params?.chatId, user, toast]);

  if (!user || !params?.chatId || loading) return null;

  if (!chatData) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card className="p-4 text-center">
          <p>Този чат не съществува или нямате достъп до него.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <ChatComponent chatId={params.chatId} />
    </div>
  );
}