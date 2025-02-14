import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, PawPrint } from "lucide-react";
import { Link } from "wouter";
import { Button } from "./ui/button";
import { UserMenu } from "./UserMenu";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function Navbar() {
  const { user, userData, loading } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      let count = 0;
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const lastMessage = data.lastMessage;
        const readBy = data.readBy || {};

        if (
          lastMessage &&
          lastMessage.senderId !== user.uid &&
          (!readBy[user.uid] || new Date(readBy[user.uid]) < new Date(lastMessage.createdAt.toDate()))
        ) {
          count += 1;
        }
      });
      setUnreadCount(count);
    });

    return () => unsubscribe();
  }, [user]);

  const markMessagesAsRead = async () => {
    if (!user || unreadCount === 0) return;

    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid)
    );

    const snapshot = await getDocs(chatsQuery);
    snapshot.docs.forEach(async (docSnap) => {
      const data = docSnap.data();
      const lastMessage = data.lastMessage;
      const readBy = data.readBy || {};

      if (
        lastMessage &&
        lastMessage.senderId !== user.uid &&
        (!readBy[user.uid] || new Date(readBy[user.uid]) < new Date(lastMessage.createdAt.toDate()))
      ) {
        const chatRef = doc(db, "chats", docSnap.id);
        await updateDoc(chatRef, {
          [`readBy.${user.uid}`]: new Date()
        });
      }
    });
    setUnreadCount(0);
  };

  if (loading) {
    return (
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="/">
            <div className="mr-6 flex items-center space-x-2">
              <PawPrint className="h-6 w-6 text-primary" />
              <span className="font-bold">DoggyCat</span>
            </div>
          </Link>
          <div className="ml-auto">
            <span className="text-muted-foreground">Зареждане...</span>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/">
          <div className="mr-6 flex items-center space-x-1">
            <img src="/paw-house-logo.png" alt="AdoptMe" className="h-13 w-14" />
            <div className="flex items-center justify-center h-12">
              <span className="font-bold translate-y-[1px]">
                <span style={{ color: '#004AAD' }}>Adopt</span>
                <span style={{ color: '#01BFFF' }}>Me</span>
              </span>
            </div>
          </div>
        </Link>

        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <Link href="/create-listing">
                <Button className="bg-[#004AAD] hover:bg-[#01BFFF] text-white">Добави обява</Button>
              </Link>
              <Link href="/messages" className="relative" onClick={markMessagesAsRead}>
                <Button variant="ghost" size="icon" className="relative hover:bg-[#01BFFF]/10">
                  <MessageSquare className="h-5 w-5 text-[#004AAD]" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </Link>
              <UserMenu />
            </>
          ) : (
            <Link href="/auth">
              <Button>Вход / Регистрация</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}