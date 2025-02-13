
import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Chat() {
  const [, params] = useRoute("/chat/:chatId");
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState(null);

  useEffect(() => {
    if (!params?.chatId || !user) return;

    // Subscribe to messages
    const messagesRef = collection(db, `chats/${params.chatId}/messages`);
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(newMessages);
    });

    // Get other user's info
    const otherUserId = params.chatId.replace(user.uid, "").replace("-", "");
    const userRef = doc(db, "users", otherUserId);
    getDoc(userRef).then((doc) => {
      if (doc.exists()) {
        setOtherUser(doc.data());
      }
    });

    return () => unsubscribe();
  }, [params?.chatId, user]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messagesRef = collection(db, `chats/${params.chatId}/messages`);
    await addDoc(messagesRef, {
      text: newMessage,
      senderId: user.uid,
      createdAt: serverTimestamp()
    });

    setNewMessage("");
  };

  if (!user || !params?.chatId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="h-[80vh]">
        <CardHeader>
          <CardTitle>{otherUser?.username || "Чат"}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col h-full">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === user.uid ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[70%] ${
                      message.senderId === user.uid
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <form onSubmit={sendMessage} className="flex gap-2 pt-4">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Напишете съобщение..."
              className="flex-1"
            />
            <Button type="submit">Изпрати</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
