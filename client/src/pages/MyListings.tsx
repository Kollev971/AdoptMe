import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { PawPrint } from "lucide-react";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { ListingCard } from "@/components/ListingCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2 } from "lucide-react";

export default function MyListings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("active"); 

  useEffect(() => {
    if (!user) return;

    let q;
    if (selectedFilter === "active") {
      q = query(
        collection(db, "listings"),
        where("userId", "==", user.uid), // Filter by user ID
        orderBy("createdAt", "desc")
      );
    } else {
      q = query(
        collection(db, "archived"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Error loading listings:", error); // Log the error to the console
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, selectedFilter]);

  const handleDeleteClick = (listingId: string) => {
    setListingToDelete(listingId);
    setDeleteDialogOpen(true);
  };

  const handleArchiveClick = async (listingId: string) => {
    try {
      await updateDoc(doc(db, "listings", listingId), { archived: true, isActive: false }); // Update both archived and isActive
      toast({ title: "Успешно", description: "Обявата беше архивирана" });
    } catch (error) {
      console.error("Error archiving listing:", error); // Log the error to the console
      toast({ 
        title: "Грешка", 
        description: "Проблем при архивирането на обявата", 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!listingToDelete) return;

    try {
      setDeleting(true);
      await deleteDoc(doc(db, "listings", listingToDelete));
      toast({ title: "Успешно", description: "Обявата беше изтрита" });
    } catch (error) {
      console.error("Error deleting listing:", error); // Log the error to the console
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
        <CardHeader className="bg-[#D89EAA] text-white">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <PawPrint className="h-6 w-6" />
            Моите обяви
          </CardTitle>
        </CardHeader>
        <div className="flex items-center gap-4 mb-4 px-6">
          <button
            className={`rounded-md px-4 py-2 ${selectedFilter === "active" ? "bg-[#D89EAA] text-white" : "bg-gray-200 text-gray-700"}`}
            onClick={() => setSelectedFilter("active")}
          >
            Активни
          </button>
          <button
            className={`rounded-md px-4 py-2 ${selectedFilter === "archived" ? "bg-[#D89EAA] text-white" : "bg-gray-200 text-gray-700"}`}
            onClick={() => setSelectedFilter("archived")}
          >
            Архивирани
          </button>
        </div>
        <ScrollArea className="h-[calc(100vh-200px)] px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
            {listings.length > 0 ? (
              listings.filter(listing => selectedFilter === "active" ? !listing.archived : listing.archived) 
                .map(listing => (
                  <ListingCard 
                    key={listing.id} 
                    listing={listing} 
                    onDelete={() => handleDeleteClick(listing.id)}
                    onArchive={() => handleArchiveClick(listing.id)}
                    showActions 
                  />
                ))
            ) : (
              <div className="col-span-full text-center text-muted-foreground">
                Нямате създадени обяви
              </div>
            )}
          </div>
        </ScrollArea>
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