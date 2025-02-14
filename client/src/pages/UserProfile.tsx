
import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { doc, getDoc, collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UserProfile() {
  const [, params] = useRoute("/user/:id");
  const { userData } = useAuth();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [rating, setRating] = useState<number>(0);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [averageRating, setAverageRating] = useState<number>(0);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!params?.id) return;
      
      const userDoc = await getDoc(doc(db, "users", params.id));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
        
        // Fetch average rating
        const ratingsQuery = query(collection(db, "ratings"), where("targetUserId", "==", params.id));
        const ratingsSnap = await getDocs(ratingsQuery);
        let total = 0;
        ratingsSnap.forEach(doc => total += doc.data().rating);
        setAverageRating(ratingsSnap.size > 0 ? total / ratingsSnap.size : 0);

        // Fetch user's rating if they've rated before
        if (userData?.uid) {
          const userRatingQuery = query(
            collection(db, "ratings"),
            where("targetUserId", "==", params.id),
            where("ratingUserId", "==", userData.uid)
          );
          const userRatingSnap = await getDocs(userRatingQuery);
          if (!userRatingSnap.empty) {
            setUserRating(userRatingSnap.docs[0].data().rating);
          }
        }
      }
    };

    fetchUserProfile();
  }, [params?.id, userData?.uid]);

  const handleRate = async (rating: number) => {
    if (!userData?.uid || !params?.id) return;
    
    try {
      const ratingsRef = collection(db, "ratings");
      await addDoc(ratingsRef, {
        targetUserId: params.id,
        ratingUserId: userData.uid,
        rating,
        timestamp: new Date()
      });
      
      setUserRating(rating);
      toast({
        title: "Успешно оценяване",
        description: "Благодарим за вашата оценка!",
      });
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Възникна проблем при оценяването.",
        variant: "destructive",
      });
    }
  };

  if (!userProfile) return <div>Loading...</div>;

  return (
    <div className="container max-w-2xl py-8">
      <div className="flex flex-col items-center gap-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#004AAD]">{userProfile.fullName}</h1>
          <p className="text-gray-600">@{userProfile.username}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-lg">Рейтинг: {averageRating.toFixed(1)}</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Button
                key={star}
                variant="ghost"
                size="sm"
                onClick={() => handleRate(star)}
                disabled={userRating !== null}
                className={`p-1 ${
                  (userRating || rating) >= star ? "text-yellow-400" : "text-gray-300"
                }`}
                onMouseEnter={() => !userRating && setRating(star)}
                onMouseLeave={() => !userRating && setRating(0)}
              >
                <Star className="h-6 w-6" />
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
