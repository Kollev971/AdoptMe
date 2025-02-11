import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import type { User, Listing, AdoptionRequest } from "@shared/schema";
import { ListingCard } from "@/components/ListingCard";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Profile() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [adoptionRequests, setAdoptionRequests] = useState<AdoptionRequest[]>([]);

  useEffect(() => {
    if (!user) return;

    const listingsRef = collection(db, "listings");
    const q = query(
      listingsRef,
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Listing[];
      setListings(listingsData);
    });

    return () => unsubscribe();

        // Fetch user's adoption requests
        const requestsQuery = query(
          collection(db, "adoptionRequests"),
          where("userId", "==", user.uid)
        );
        const requestsSnapshot = await getDocs(requestsQuery);
        const requestsData = requestsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AdoptionRequest[];
        setAdoptionRequests(requestsData);

      } catch (error: any) {
        toast({
          title: "Грешка",
          description: "Възникна проблем при зареждането на данните",
          variant: "destructive",
        });
      }
    };

    fetchUserContent();
  }, [user]);

  if (!userData) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Информация за профила</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="font-medium">Потребителско име:</span> {userData.username}
          </div>
          <div>
            <span className="font-medium">Име:</span> {userData.fullName}
          </div>
          <div>
            <span className="font-medium">Имейл:</span> {userData.email}
          </div>
          <div>
            <span className="font-medium">Телефон:</span> {userData.phone}
          </div>
          <div>
            <span className="font-medium">Регистриран на:</span>{" "}
            {new Date(userData.createdAt).toLocaleDateString('bg-BG')}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="listings">
        <TabsList>
          <TabsTrigger value="listings">Моите обяви</TabsTrigger>
          <TabsTrigger value="requests">Заявки за осиновяване</TabsTrigger>
        </TabsList>

        <TabsContent value="listings">
          {listings.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500">Все още нямате публикувани обяви</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="requests">
          {adoptionRequests.length > 0 ? (
            <div className="space-y-4">
              {adoptionRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Заявка за осиновяване: {request.listingId}</p>
                        <p className="text-sm text-gray-500">
                          Статус: {
                            request.status === 'pending' ? 'Изчакваща' :
                            request.status === 'approved' ? 'Одобрена' :
                            'Отхвърлена'
                          }
                        </p>
                        <p className="text-sm mt-2">{request.message}</p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(request.createdAt).toLocaleDateString('bg-BG')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500">Все още нямате заявки за осиновяване</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}