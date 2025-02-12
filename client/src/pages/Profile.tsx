import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import type { Listing } from "@shared/schema";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Profile() {
  const { user, updatePassword } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");

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

  const handlePasswordChange = async () => {
    try {
      await updatePassword(newPassword);
      toast({
        title: "Успешно",
        description: "Паролата е променена успешно"
      });
      setNewPassword("");
    } catch (error: any) {
      toast({
        title: "Грешка",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Tabs defaultValue="listings" className="space-y-6">
        <TabsList className="w-full justify-start bg-card p-1 rounded-lg">
          <TabsTrigger value="listings" className="flex-1">Моите обяви</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1">Настройки</TabsTrigger>
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

        <TabsContent value="settings">
          <Card>
            <CardContent className="space-y-4 p-6">
              <h3 className="text-lg font-semibold">Смяна на парола</h3>
              <div className="flex gap-4">
                <Input
                  type="password"
                  placeholder="Нова парола"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Button onClick={handlePasswordChange}>Промени</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}