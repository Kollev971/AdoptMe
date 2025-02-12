import { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs, deleteDoc, doc, onSnapshot, getDoc, updateDoc, setDoc, getFirestore, writeBatch } from "firebase/firestore";
import type { Listing, AdoptionRequest } from "@shared/schema";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [listings, setListings] = useState<Listing[]>([]);
  const [adoptionRequests, setAdoptionRequests] = useState<(AdoptionRequest & { listingName?: string; adopterName?: string })[]>([]);
  const [sentRequests, setSentRequests] = useState<(AdoptionRequest & { listingName?: string; ownerName?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper function to generate consistent chat IDs
  const generateChatId = (ownerId: string, adopterId: string) => {
    return [ownerId, adopterId].sort().join('_');
  };

  // Fetch user's listings
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "listings"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Listing[]);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching listings:", error);
      toast({
        title: "Грешка",
        description: "Възникна проблем при зареждането на обявите",
        variant: "destructive",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch received adoption requests
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "adoptionRequests"),
      where("ownerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const requestsData = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const request = { id: docSnap.id, ...docSnap.data() } as AdoptionRequest;
            const [listingSnap, userSnap] = await Promise.all([
              getDoc(doc(db, "listings", request.listingId)),
              getDoc(doc(db, "users", request.userId))
            ]);

            return {
              ...request,
              listingName: listingSnap.exists() ? listingSnap.data()?.title : "Обявата е изтрита",
              adopterName: userSnap.exists() ? userSnap.data()?.username : "Потребителят е изтрит"
            };
          })
        );
        setAdoptionRequests(requestsData);
      } catch (error) {
        console.error("Error fetching adoption requests:", error);
        toast({
          title: "Грешка",
          description: "Възникна проблем при зареждането на заявките",
          variant: "destructive",
        });
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch sent adoption requests
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "adoptionRequests"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const requestsData = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const request = { id: docSnap.id, ...docSnap.data() } as AdoptionRequest;
            const [listingSnap, userSnap] = await Promise.all([
              getDoc(doc(db, "listings", request.listingId)),
              getDoc(doc(db, "users", request.ownerId))
            ]);

            return {
              ...request,
              listingName: listingSnap.exists() ? listingSnap.data()?.title : "Обявата е изтрита",
              ownerName: userSnap.exists() ? userSnap.data()?.username : "Потребителят е изтрит"
            };
          })
        );
        setSentRequests(requestsData);
      } catch (error) {
        console.error("Error fetching sent requests:", error);
        toast({
          title: "Грешка",
          description: "Възникна проблем при зареждането на изпратените заявки",
          variant: "destructive",
        });
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleApproveRequest = async (request: AdoptionRequest) => {
    if (!user) return;

    try {
      const batch = writeBatch(db);

      // Update request status
      const requestRef = doc(db, "adoptionRequests", request.id);
      batch.update(requestRef, {
        status: "approved",
        updatedAt: new Date().toISOString()
      });

      // Create or update chat room
      const chatId = generateChatId(request.ownerId, request.userId);
      const chatRef = doc(db, "chats", chatId);

      batch.set(chatRef, {
        participants: {
          [request.ownerId]: true,
          [request.userId]: true
        },
        listingId: request.listingId,
        createdAt: new Date().toISOString(),
        lastMessage: {
          text: "Заявката беше одобрена! Можете да започнете разговор.",
          senderId: user.uid,
          timestamp: new Date().toISOString()
        }
      }, { merge: true });

      // Create initial system message in the chat
      const messagesCollection = collection(db, "chats", chatId, "messages");
      const messageRef = doc(messagesCollection);
      batch.set(messageRef, {
        text: "Заявката беше одобрена! Можете да започнете разговор.",
        senderId: "system",
        createdAt: new Date().toISOString(),
        type: "system"
      });

      // Commit the batch
      await batch.commit();

      toast({
        title: "Успешно",
        description: "Заявката е одобрена и чатът е създаден"
      });
    } catch (error: any) {
      console.error("Error approving request:", error);
      toast({
        title: "Грешка",
        description: error.message || "Възникна проблем при одобряването на заявката",
        variant: "destructive"
      });
    }
  };

  const openChat = (ownerId: string, adopterId: string) => {
    const chatId = generateChatId(ownerId, adopterId);
    setLocation(`/chat/${chatId}`);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Изчакваща", class: "bg-yellow-500" },
      approved: { label: "Одобрена", class: "bg-green-500" },
      rejected: { label: "Отхвърлена", class: "bg-red-500" }
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge className={config.class}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Tabs defaultValue="listings" className="space-y-6">
        <TabsList className="w-full justify-start bg-card p-1 rounded-lg">
          <TabsTrigger value="listings" className="flex-1">Моите обяви</TabsTrigger>
          <TabsTrigger value="requests" className="flex-1">Получени заявки</TabsTrigger>
          <TabsTrigger value="sentRequests" className="flex-1">Изпратени заявки</TabsTrigger>
        </TabsList>

        <TabsContent value="listings">
          <ScrollArea className="h-[70vh]">
            <div className="space-y-4 pr-4">
              {listings.length > 0 ? listings.map(listing => (
                <Card key={listing.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {listing.images && listing.images[0] && (
                        <div className="w-full md:w-48 h-48 relative">
                          <img
                            src={listing.images[0]}
                            alt={listing.title}
                            className="absolute inset-0 w-full h-full object-cover rounded-lg"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{listing.title}</h3>
                        <p className="text-muted-foreground mb-4">{listing.description}</p>
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="outline">{listing.type}</Badge>
                          <Badge variant="outline">{listing.age} години</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <p className="text-center text-muted-foreground">Нямате създадени обяви</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="requests">
          <ScrollArea className="h-[70vh]">
            <div className="space-y-4 pr-4">
              {adoptionRequests.length > 0 ? adoptionRequests.map(request => (
                <Card key={request.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{request.listingName}</h3>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          От: <span className="font-medium">{request.adopterName}</span>
                        </p>
                        <p className="text-sm border-l-2 border-primary pl-3 my-3">{request.message}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        {request.status === "pending" && (
                          <Button
                            onClick={() => handleApproveRequest(request)}
                            size="sm"
                            className="w-[120px]"
                          >
                            Одобри
                          </Button>
                        )}
                        {request.status === "approved" && (
                          <Button
                            onClick={() => openChat(request.ownerId, request.userId)}
                            variant="outline"
                            size="sm"
                            className="w-[120px]"
                          >
                            Отвори чат
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <p className="text-center text-muted-foreground">Нямате получени заявки</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="sentRequests">
          <ScrollArea className="h-[70vh]">
            <div className="space-y-4 pr-4">
              {sentRequests.length > 0 ? sentRequests.map(request => (
                <Card key={request.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{request.listingName}</h3>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Към: <span className="font-medium">{request.ownerName}</span>
                        </p>
                        <p className="text-sm border-l-2 border-primary pl-3 my-3">{request.message}</p>
                      </div>
                      {request.status === "approved" && (
                        <Button
                          onClick={() => openChat(request.ownerId, request.userId)}
                          variant="outline"
                          size="sm"
                          className="w-[120px]"
                        >
                          Отвори чат
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <p className="text-center text-muted-foreground">Нямате изпратени заявки</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}