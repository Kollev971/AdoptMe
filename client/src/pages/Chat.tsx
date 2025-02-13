import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
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
        const chatRef = doc(db, "chats", params.chatId);
        const chatDoc = await getDoc(chatRef);

        if (!chatDoc.exists()) {
          // Create the chat if it doesn't exist
          await setDoc(chatRef, {
            participants: [user.uid],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          setChatData({
            id: params.chatId,
            participants: [user.uid],
          });
        } else {
          const data = chatDoc.data();
          setChatData(data);
        }
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

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <ChatComponent chatId={params.chatId} />
    </div>
  );
}