import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs, deleteDoc, doc, onSnapshot, getDoc, updateDoc, setDoc } from "firebase/firestore";
import type { Listing, AdoptionRequest } from "@shared/schema";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [adoptionRequests, setAdoptionRequests] = useState<AdoptionRequest & { listingName?: string; adopterName?: string }[]>([]);
  const [sentRequests, setSentRequests] = useState<AdoptionRequest & { listingName?: string; ownerName?: string }[]>([]);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch user's listings
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "listings"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
      setListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Listing[]);
    });
  }, [user]);

  // Fetch received adoption requests
  useEffect(() => {
    if (!user) return;

    const receivedRequestsQuery = query(
      collection(db, "adoptionRequests"),
      where("ownerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(receivedRequestsQuery, async (snapshot) => {
      const requestsData = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const request = { id: docSnap.id, ...docSnap.data() } as AdoptionRequest;
        const listingSnap = await getDoc(doc(db, "listings", request.listingId));
        const userSnap = await getDoc(doc(db, "users", request.userId));

        return {
          ...request,
          listingName: listingSnap.exists() ? listingSnap.data()?.title : "Обявата е изтрита",
          adopterName: userSnap.exists() ? userSnap.data()?.username : "Потребителят е изтрит"
        };
      }));
      setAdoptionRequests(requestsData);
    });
  }, [user]);

  // Fetch sent adoption requests
  useEffect(() => {
    if (!user) return;

    const sentRequestsQuery = query(
      collection(db, "adoptionRequests"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(sentRequestsQuery, async (snapshot) => {
      const requestsData = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const request = { id: docSnap.id, ...docSnap.data() } as AdoptionRequest;
        const listingSnap = await getDoc(doc(db, "listings", request.listingId));
        const ownerSnap = await getDoc(doc(db, "users", request.ownerId));

        return {
          ...request,
          listingName: listingSnap.exists() ? listingSnap.data()?.title : "Обявата е изтрита",
          ownerName: ownerSnap.exists() ? ownerSnap.data()?.username : "Потребителят е изтрит"
        };
      }));
      setSentRequests(requestsData);
    });
  }, [user]);

  const generateChatId = (ownerId: string, adopterId: string) => {
    // Sort IDs to ensure consistent chat ID regardless of who creates it
    const sortedIds = [ownerId, adopterId].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
  };

  const handleApproveRequest = async (request: AdoptionRequest) => {
    if (!user) return;

    try {
      // Update request status
      const requestRef = doc(db, "adoptionRequests", request.id);
      await updateDoc(requestRef, {
        status: "approved",
        updatedAt: new Date().toISOString()
      });

      // Create a chat room with sorted IDs to ensure consistency
      const chatId = generateChatId(request.ownerId, request.userId);
      const chatRef = doc(db, "chats", chatId);

      // Use set with merge to prevent duplicate chat rooms
      await setDoc(chatRef, {
        participants: [request.ownerId, request.userId],
        listingId: request.listingId,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }, { merge: true });

      toast({
        title: "Успешно",
        description: "Заявката е одобрена и чатът е създаден",
      });
    } catch (error) {
      console.error("Error approving request:", error);
      toast({
        title: "Грешка",
        description: "Възникна проблем при одобряването на заявката",
        variant: "destructive",
      });
    }
  };

  const openChat = (ownerId: string, userId: string) => {
    const chatId = generateChatId(ownerId, userId);
    setLocation(`/chat/${chatId}`);
  };

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <Tabs defaultValue="listings">
        <TabsList className="bg-gray-100 p-2 rounded-lg">
          <TabsTrigger value="listings">Моите обяви</TabsTrigger>
          <TabsTrigger value="requests">Получени заявки</TabsTrigger>
          <TabsTrigger value="sentRequests">Изпратени заявки</TabsTrigger>
        </TabsList>

        <TabsContent value="listings">
          <div className="space-y-4">
            {listings.length > 0 ? listings.map(listing => (
              <Card key={listing.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-2">{listing.title}</h3>
                  <p className="text-gray-600">{listing.description}</p>
                  {listing.images?.length > 0 && (
                    <div className="mt-4 flex gap-2 overflow-x-auto">
                      {listing.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`${listing.title} - ${index + 1}`}
                          className="h-24 w-24 object-cover rounded"
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )) : (
              <p className="text-center text-gray-500">Нямате създадени обяви</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <div className="space-y-4">
            {adoptionRequests.length > 0 ? adoptionRequests.map(request => (
              <Card key={request.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">Обява: {request.listingName}</h3>
                      <p className="text-sm text-gray-600">От: {request.adopterName}</p>
                      <p className="mt-2">{request.message}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Статус: <span className="font-medium">{request.status}</span>
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {request.status === "pending" && (
                        <Button 
                          onClick={() => handleApproveRequest(request)}
                          variant="default"
                          size="sm"
                        >
                          Одобри
                        </Button>
                      )}
                      {request.status === "approved" && (
                        <Button
                          onClick={() => openChat(request.ownerId, request.userId)}
                          variant="outline"
                          size="sm"
                        >
                          Отвори чат
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <p className="text-center text-gray-500">Нямате получени заявки</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sentRequests">
          <div className="space-y-4">
            {sentRequests.length > 0 ? sentRequests.map(request => (
              <Card key={request.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">Обява: {request.listingName}</h3>
                      <p className="text-sm text-gray-600">Към: {request.ownerName}</p>
                      <p className="mt-2">{request.message}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Статус: <span className="font-medium">{request.status}</span>
                      </p>
                    </div>
                    {request.status === "approved" && (
                      <Button
                        onClick={() => openChat(request.ownerId, request.userId)}
                        variant="outline"
                        size="sm"
                      >
                        Отвори чат
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )) : (
              <p className="text-center text-gray-500">Нямате изпратени заявки</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}