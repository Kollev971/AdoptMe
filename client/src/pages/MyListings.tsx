
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { PawPrint, Archive } from "lucide-react";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { ListingCard } from "@/components/ListingCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function MyListings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeListings, setActiveListings] = useState<any[]>([]);
  const [archivedListings, setArchivedListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const activeQuery = query(
      collection(db, "listings"),
      where("userId", "==", user.uid),
      where("status", "!=", "archived"),
      orderBy("status"),
      orderBy("createdAt", "desc")
    );

    const archivedQuery = query(
      collection(db, "listings"),
      where("userId", "==", user.uid),
      where("archived", "==", true),
      orderBy("createdAt", "desc")
    );

    const unsubscribeActive = onSnapshot(activeQuery, (snapshot) => {
      setActiveListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const unsubscribeArchived = onSnapshot(archivedQuery, (snapshot) => {
      setArchivedListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeActive();
      unsubscribeArchived();
    };
  }, [user]);

  const handleDeleteClick = (listingId: string) => {
    setListingToDelete(listingId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!listingToDelete) return;

    try {
      setDeleting(true);
      await deleteDoc(doc(db, "listings", listingToDelete));
      toast({ title: "Успешно", description: "Обявата беше изтрита" });
    } catch (error) {
      toast({ 
        title: "Грешка", 
        description: "Проблем при изтриването на обявата", 
        variant: "destructive" 
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setListingToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Моите обяви</CardTitle>
          </CardHeader>
          <div className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Зареждане...</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-[#F0F7FF] min-h-screen">
      <Card className="border border-[#004AAD] shadow-xl">
        <CardHeader className="bg-[#004AAD] text-white">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <PawPrint className="h-6 w-6" />
            Моите обяви
          </CardTitle>
        </CardHeader>

        <Alert className="m-6">
          <Archive className="h-4 w-4" />
          <AlertDescription>
            Обявите автоматично се архивират след 30 дни от публикуването им. 
            Архивираните обяви не са видими за други потребители, но вие можете да ги преглеждате тук.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="active" className="p-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">Активни обяви</TabsTrigger>
            <TabsTrigger value="archived">Архивирани обяви</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active">
            <ScrollArea className="h-[calc(100vh-400px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeListings.length > 0 ? (
                  activeListings.map(listing => (
                    <ListingCard 
                      key={listing.id} 
                      listing={listing} 
                      onDelete={() => handleDeleteClick(listing.id)}
                      showActions
                      hideConnect
                    />
                  ))
                ) : (
                  <div className="col-span-full text-center text-muted-foreground">
                    Нямате активни обяви
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="archived">
            <ScrollArea className="h-[calc(100vh-400px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {archivedListings.length > 0 ? (
                  archivedListings.map(listing => (
                    <ListingCard 
                      key={listing.id} 
                      listing={listing} 
                      onDelete={() => handleDeleteClick(listing.id)}
                      showActions
                      hideConnect
                    />
                  ))
                ) : (
                  <div className="col-span-full text-center text-muted-foreground">
                    Нямате архивирани обяви
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Изтриване на обява</AlertDialogTitle>
            <AlertDialogDescription>
              Сигурни ли сте, че искате да изтриете тази обява? Това действие не може да бъде отменено.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Отказ</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Изтриване...
                </>
              ) : (
                "Изтрий"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
