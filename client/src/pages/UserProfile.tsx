import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { doc, getDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ListingCard } from "@/components/ListingCard";
import { ScrollArea } from "@/components/ui/scroll-area";

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
        let hasError = false;

        // Fetch user profile
        const userDoc = await getDoc(doc(db, "users", params.id));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        } else {
          hasError = true;
        }

        // Continue fetching data only if user exists
        if (!hasError) {
          // Fetch user's listings
          const listingsQuery = query(
            collection(db, "listings"),
            where("userId", "==", params.id)
          );
          const listingsSnap = await getDocs(listingsQuery);
          setListings(listingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

          // Fetch ratings
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

          // Fetch user's rating if they've rated before
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
        }

        if (hasError) {
          toast({
            title: "Грешка",
            description: "Потребителят не беше намерен",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        // Only show error toast for critical errors
        if (error.code !== 'permission-denied') {
          toast({
            title: "Грешка",
            description: "Проблем при зареждането на профила",
            variant: "destructive",
          });
        }
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
        timestamp: new Date()
      });

      setUserRating(rating);
      toast({
        title: "Успешно оценяване",
        description: "Благодарим за вашата оценка!",
      });

      // Update average rating
      const ratingsQuery = query(
        collection(db, "ratings"),
        where("targetUserId", "==", params.id)
      );
      const ratingsSnap = await getDocs(ratingsQuery);
      let total = 0;
      ratingsSnap.forEach(doc => total += doc.data().rating);
      setAverageRating(ratingsSnap.size > 0 ? total / ratingsSnap.size : 0);
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
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userProfile) return null;

  return (
    <div className="container max-w-7xl py-8 space-y-8">
      <Card className="border-2 border-primary">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Avatar className="h-32 w-32">
              <AvatarImage src={userProfile.photoURL} />
              <AvatarFallback className="text-4xl bg-primary text-primary-foreground">
                {userProfile.username?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <CardTitle className="text-3xl">{userProfile.fullName}</CardTitle>
            <p className="text-xl text-muted-foreground">@{userProfile.username}</p>
            {userProfile.bio && (
              <p className="mt-4 text-muted-foreground">{userProfile.bio}</p>
            )}
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg">Рейтинг: {averageRating.toFixed(1)}</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  disabled={userRating !== null || user?.uid === params?.id}
                  className={`p-1 ${
                    (userRating || rating) >= star 
                      ? "text-yellow-400" 
                      : "text-gray-300"
                  } transition-colors`}
                  onMouseEnter={() => !userRating && setRating(star)}
                  onMouseLeave={() => !userRating && setRating(0)}
                >
                  <Star className="h-6 w-6" />
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Обяви на потребителя</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.length > 0 ? (
                listings.map(listing => (
                  <ListingCard 
                    key={listing.id}
                    listing={listing}
                  />
                ))
              ) : (
                <p className="col-span-full text-center text-muted-foreground">
                  Този потребител все още няма обяви
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}