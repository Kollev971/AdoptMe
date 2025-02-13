
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, PawPrint } from "lucide-react";
import { Link } from "wouter";
import { Button } from "./ui/button";
import { UserMenu } from "./UserMenu";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
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
      const count = snapshot.docs.reduce((acc, doc) => {
        const data = doc.data();
        const lastMessage = data.lastMessage;
        const readBy = data.readBy || {};
        
        if (lastMessage && 
            lastMessage.senderId !== user.uid && 
            (!readBy[user.uid] || new Date(readBy[user.uid]) < new Date(lastMessage.createdAt.toDate()))) {
          return acc + 1;
        }
        return acc;
      }, 0);
      
      setUnreadCount(count);
    });

    return () => unsubscribe();
  }, [user]);

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
                <span style={{color: '#004AAD'}}>Adopt</span>
                <span style={{color: '#01BFFF'}}>Me</span>
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
              <Link href="/messages" className="relative">
                <Button variant="ghost" size="icon" className="relative hover:bg-[#01BFFF]/10">
                  <MessageSquare className="h-5 w-5 text-[#004AAD]" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium flex items-center justify-center text-primary-foreground" 
                    style={{ display: unreadCount > 0 ? 'flex' : 'none' }}>
                    {unreadCount}
                  </span>
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
