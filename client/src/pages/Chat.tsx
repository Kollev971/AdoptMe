import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useParams } from "wouter";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Chat() {
  const { user } = useAuth();
  const { chatId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (!chatId) return;
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [chatId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    const messagesRef = collection(db, "chats", chatId, "messages");

    await addDoc(messagesRef, {
      text: newMessage,
      senderId: user.uid,
      createdAt: serverTimestamp()
    });
    setNewMessage("");
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Чат</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 overflow-y-auto border-b pb-4 mb-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`mb-2 ${msg.senderId === user?.uid ? "text-right" : "text-left"}`}>
                <span className="inline-block bg-gray-200 px-3 py-1 rounded-lg">{msg.text}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Напишете съобщение..."
            />
            <Button onClick={handleSendMessage}>Изпрати</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
