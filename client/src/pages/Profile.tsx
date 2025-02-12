import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePassword } from "firebase/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { Listing } from "@shared/schema";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";


export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "listings"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Listing[]);
      setLoadingListings(false);
    }, (error) => {
      console.error("Error fetching listings:", error);
      toast({
        title: "Грешка",
        description: "Възникна проблем при зареждането на обявите",
        variant: "destructive",
      });
      setLoadingListings(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handlePasswordChange = async () => {
    if (!user || !newPassword) return;

    try {
      setLoading(true);
      await updatePassword(user, newPassword);
      toast({
        title: "Успешно",
        description: "Паролата беше променена успешно",
      });
      setNewPassword("");
    } catch (error: any) {
      toast({
        title: "Грешка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    try {
      await deleteDoc(doc(db, "listings", listingId));
      toast({
        title: "Успешно",
        description: "Обявата беше изтрита успешно",
      });
    } catch (error: any) {
      toast({
        title: "Грешка",
        description: "Възникна проблем при изтриването на обявата",
        variant: "destructive",
      });
    }
  };

  if (loadingListings) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">Настройки</TabsTrigger>
          <TabsTrigger value="listings">Моите обяви</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Настройки на профила</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Имейл</h3>
                <p className="text-muted-foreground">{user?.email}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Промяна на парола</h3>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Нова парола"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Button onClick={handlePasswordChange} disabled={loading}>
                    {loading ? "Промяна..." : "Промени"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
                        <Button 
                          variant="destructive" 
                          onClick={() => handleDeleteListing(listing.id)}
                        >
                          Изтрий обява
                        </Button>
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
      </Tabs>
    </div>
  );
}