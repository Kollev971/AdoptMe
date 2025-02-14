import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePassword, updateProfile } from "firebase/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, updateDoc, getDoc } from "firebase/firestore";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setDisplayName(userData.fullName || "");
        setUsername(userData.username || "");
        setPhoneNumber(userData.phone || "");
      }
    };

    fetchUserData();

    const q = query(
      collection(db, "listings"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingListings(false);
    }, (error) => {
      toast({ title: "Грешка", description: "Проблем при зареждането на обявите", variant: "destructive" });
      setLoadingListings(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handlePasswordChange = async () => {
    if (!user || !newPassword || newPassword !== confirmPassword) return;

    try {
      setLoading(true);
      await updatePassword(user, newPassword);
      await updateDoc(doc(db, "users", user.uid), { password: newPassword });
      toast({ title: "Успешно", description: "Паролата е променена успешно" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast({ title: "Грешка", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async (listingId) => {
    try {
      await deleteDoc(doc(db, "listings", listingId));
      toast({ title: "Успешно", description: "Обявата беше изтрита успешно" });
    } catch (error) {
      toast({ title: "Грешка", description: "Възникна проблем при изтриването на обявата", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="mb-6 p-6">
        <CardHeader>
          <CardTitle>Информация за профила</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-medium">Имейл</h3>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
          <div>
            <h3 className="text-lg font-medium">Име</h3>
            <p className="text-muted-foreground">{displayName}</p>
          </div>
          <div>
            <h3 className="text-lg font-medium">Потребителско име</h3>
            <p className="text-muted-foreground">{username}</p>
          </div>
          <div>
            <h3 className="text-lg font-medium">Телефонен номер</h3>
            <p className="text-muted-foreground">{phoneNumber}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="listings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="listings">Моите обяви</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="listings">
          <ScrollArea className="h-[70vh]">
            <div className="space-y-4 pr-4">
              {listings.length > 0 ? listings.map(listing => (
                <Card key={listing.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {listing.images?.[0] && (
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
                        <Button variant="destructive" onClick={() => handleDeleteListing(listing.id)}>
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
