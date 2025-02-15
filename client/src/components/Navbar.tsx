import { useAuth } from "@/hooks/useAuth";
import { MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { Button } from "./ui/button";
import { UserMenu } from "./UserMenu";
import { useState, useEffect, useRef } from "react";
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "./ui/badge";

export function Navbar() {
  const { user, userData, loading } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedRef = useRef(0);
  const notificationTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!user) return;

    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    // Clear any existing timeout
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      let count = 0;
      let latestMessageTime = 0;

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const lastMessage = data.lastMessage;
        const readBy = data.readBy || {};

        if (lastMessage?.createdAt) {
          const messageTime = lastMessage.createdAt.seconds * 1000;
          latestMessageTime = Math.max(latestMessageTime, messageTime);
        }

        if (
          lastMessage &&
          lastMessage.senderId !== user.uid &&
          (!readBy[user.uid] || 
            (readBy[user.uid].seconds * 1000 < lastMessage.createdAt.seconds * 1000))
        ) {
          count += 1;
        }
      });

      setUnreadCount(count);
      if (count > 0 && latestMessageTime > lastPlayedRef.current) {
        // Add a small delay to prevent rapid-fire notifications
        notificationTimeoutRef.current = setTimeout(() => {
          if (audioRef.current && document.hasFocus()) {
            audioRef.current.play().catch(err => {
              console.warn('Failed to play notification sound:', err);
            });
          }
          lastPlayedRef.current = latestMessageTime;
        }, 500);
      }
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
              <span className="font-bold">AdoptMe</span>
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
          <div className="flex items-center space-x-0 hover:opacity-90 transition-opacity">
            <img 
              src="/paw-house-logo.png" 
              alt="AdoptMe" 
              className="h-9 w-9" 
            />
            <div className="flex items-center">
              <span className="font-bold text-lg">
                <span style={{ color: '#004AAD' }}>Adopt</span>
                <span style={{ color: '#01BFFF' }}>Me</span>
              </span>
            </div>
          </div>
        </Link>

        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <Link 
                href="/messages" 
                className="relative" 
                onClick={markMessagesAsRead}
              >
                <div className="relative">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`relative hover:bg-[#01BFFF]/10 ${unreadCount > 0 ? 'bg-[#01BFFF]/5' : ''}`}
                  >
                    <MessageSquare className="h-5 w-5 text-[#004AAD]" />
                  </Button>
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </div>
              </Link>
              <UserMenu />
              <audio ref={audioRef} preload="auto">
                <source src="/notification.wav" type="audio/wav" />
              </audio>
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