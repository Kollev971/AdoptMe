
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc, getDoc, collection, query, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Upload, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileUpload } from "@/components/FileUpload";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newBio, setNewBio] = useState("");
  const [userData, setUserData] = useState<any>(null);
  const [profileImages, setProfileImages] = useState<string[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        // Fetch ratings
        const ratingsQuery = query(
          collection(db, "ratings"),
          where("targetUserId", "==", user.uid)
        );
        const ratingsSnap = await getDocs(ratingsQuery);
        
        if (!ratingsSnap.empty) {
          let total = 0;
          ratingsSnap.forEach(doc => total += doc.data().rating);
          setAverageRating(total / ratingsSnap.size);
        }

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          setNewUsername(data.username || "");
          setNewBio(data.bio || "");
          if (data.photoURL) {
            setProfileImages([data.photoURL]);
          }
        }
      } catch (error: any) {
        console.error("Error fetching user profile:", error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      }
    };

    fetchUserData();
  }, [user]);

  const handleProfileUpdate = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const updates: any = {
        username: newUsername,
        bio: newBio,
      };

      if (profileImages.length > 0) {
        updates.photoURL = profileImages[0];
        await updateProfile(user, { photoURL: profileImages[0] });
      }

      await updateDoc(doc(db, "users", user.uid), updates);

      toast({ 
        title: "Успешно", 
        description: "Профилът е обновен успешно" 
      });

      // Update local state
      setUserData(prev => ({
        ...prev,
        ...updates
      }));
    } catch (error: any) {
      toast({ 
        title: "Грешка", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!userData) return null;

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-2 border-primary">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profileImages[0] || userData.photoURL} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {userData.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-2xl">{userData.username}</CardTitle>
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="text-primary">Рейтинг: {averageRating.toFixed(1)}</span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${
                      star <= averageRating
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
            {userData.bio && (
              <p className="mt-2 text-sm text-muted-foreground">{userData.bio}</p>
            )}
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Редактиране на профил</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Профилна снимка</Label>
              <FileUpload
                images={profileImages}
                setImages={setProfileImages}
                className="mt-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Потребителско име</Label>
              <Input
                id="username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Въведете ново потребителско име"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Описание</Label>
              <Textarea
                id="bio"
                value={newBio}
                onChange={(e) => setNewBio(e.target.value)}
                placeholder="Разкажете нещо за себе си..."
                className="resize-none"
                rows={4}
              />
            </div>

            <Button 
              onClick={handleProfileUpdate} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Запазване...
                </>
              ) : (
                "Запази промените"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
