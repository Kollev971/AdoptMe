import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ListingCard } from "@/components/ListingCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";


export default function UserProfile() {
  const [, params] = useRoute("/user/:id");
  const { user } = useAuth();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [rating, setRating] = useState<number>(0);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!params?.id) return;

      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, "users", params.id));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }

        const listingsQuery = query(
          collection(db, "listings"),
          where("userId", "==", params.id)
        );
        const listingsSnap = await getDocs(listingsQuery);
        setListings(listingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const ratingsQuery = query(
          collection(db, "ratings"),
          where("targetUserId", "==", params.id)
        );
        const ratingsSnap = await getDocs(ratingsQuery);

        if (!ratingsSnap.empty) {
          let total = 0;
          ratingsSnap.forEach(doc => total += doc.data().rating);
          setAverageRating(total / ratingsSnap.size);
        }

        if (user?.uid) {
          const userRatingQuery = query(
            collection(db, "ratings"),
            where("targetUserId", "==", params.id),
            where("ratingUserId", "==", user.uid)
          );
          const userRatingSnap = await getDocs(userRatingQuery);
          if (!userRatingSnap.empty) {
            setUserRating(userRatingSnap.docs[0].data().rating);
          }
        }
      } catch (error: any) {
        toast({
          title: "Грешка",
          description: "Проблем при зареждането на профила",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [params?.id, user?.uid]);

  const handleRate = async (rating: number) => {
    if (!user?.uid || !params?.id) return;

    try {
      const ratingsRef = collection(db, "ratings");
      await addDoc(ratingsRef, {
        targetUserId: params.id,
        ratingUserId: user.uid,
        rating,
        timestamp: serverTimestamp()
      });

      setUserRating(rating);
      toast({
        title: "Успешно оценяване",
        description: "Благодарим за вашата оценка!",
      });

      const ratingsQuery = query(
        collection(db, "ratings"),
        where("targetUserId", "==", params.id)
      );
      const ratingsSnap = await getDocs(ratingsQuery);
      let total = 0;
      ratingsSnap.forEach(doc => total += doc.data().rating);
      setAverageRating(total / ratingsSnap.size);
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Възникна проблем при оценяването.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container max-w-7xl py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!userProfile) return null;

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <Avatar className="h-32 w-32 border-4 border-primary/20">
                <AvatarImage src={userProfile.photoURL} />
                <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                  {userProfile.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold flex items-center gap-2 justify-center">
                {userProfile.username}
                {userProfile.isAdmin && (
                  <Badge variant="secondary" className="bg-primary/10">
                    Администратор
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-lg font-medium">Рейтинг: {averageRating.toFixed(1)}</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRate(star)}
                      disabled={userRating !== null || user?.uid === params?.id}
                      className={`p-1 ${
                        (userRating || rating) >= star 
                          ? "text-yellow-400" 
                          : "text-gray-300"
                      } transition-colors hover:scale-110`}
                      onMouseEnter={() => !userRating && setRating(star)}
                      onMouseLeave={() => !userRating && setRating(0)}
                    >
                      <Star className="h-6 w-6" fill={(userRating || rating) >= star ? "currentColor" : "none"} />
                    </button>
                  ))}
                </div>
              </div>
              {userProfile.bio && (
                <p className="mt-4 text-muted-foreground max-w-lg mx-auto">{userProfile.bio}</p>
              )}
            </div>
          </CardHeader>
        </Card>

        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle>Обяви на потребителя</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.length > 0 ? (
                  listings.map(listing => (
                    <ListingCard 
                      key={listing.id}
                      listing={listing}
                    />
                  ))
                ) : (
                  <p className="col-span-full text-center text-muted-foreground py-8">
                    Този потребител все още няма обяви
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}