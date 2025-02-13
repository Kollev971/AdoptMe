import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from "firebase/firestore";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import ChatComponent from "@/components/Chat";

export default function ChatPage() {
  const [, params] = useRoute("/chat/:chatId");
  const { user } = useAuth();
  const { toast } = useToast();
  const [chatExists, setChatExists] = useState<boolean | null>(null);

  useEffect(() => {
    if (!params?.chatId || !user) return;

    const checkChatAccess = async () => {
      try {
        const chatDoc = await getDoc(doc(db, "chats", params.chatId));
        if (!chatDoc.exists()) {
          setChatExists(false);
          toast({
            description: "Този чат не съществува.",
            variant: "destructive",
          });
          return;
        }

        const chatData = chatDoc.data();
        if (chatData.ownerId !== user.uid && chatData.requesterId !== user.uid) {
          setChatExists(false);
          toast({
            description: "Нямате достъп до този чат.",
            variant: "destructive",
          });
          return;
        }

        setChatExists(true);
      } catch (error: any) {
        console.error("Error checking chat access:", error);
        toast({
          description: "Грешка при достъп до чата: " + error.message,
          variant: "destructive",
        });
      }
    };

    checkChatAccess();
  }, [params?.chatId, user, toast]);

  if (!user || !params?.chatId) return null;

  if (chatExists === false) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card className="p-4 text-center">
          <p>Този чат не съществува или нямате достъп до него.</p>
        </Card>
      </div>
    );
  }

  if (chatExists === null) return null;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <ChatComponent chatId={params.chatId} />
    </div>
  );
}