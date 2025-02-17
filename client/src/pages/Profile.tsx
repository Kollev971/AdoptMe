import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc, getDoc, collection, query, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Star, Phone, Mail, Calendar, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileUpload } from "@/components/FileUpload";
import AdminPanel from "@/components/AdminPanel";
import { format } from "date-fns";
import { bg } from "date-fns/locale";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newBio, setNewBio] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [userData, setUserData] = useState<any>(null);
  const [profileImages, setProfileImages] = useState<string[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [lastUsernameChange, setLastUsernameChange] = useState<Date | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
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
          setNewFullName(data.fullName || "");
          setNewBio(data.bio || "");
          setNewPhone(data.phone || "");
          setLastUsernameChange(data.lastUsernameChange ? new Date(data.lastUsernameChange) : null);
          if (data.photoURL) {
            setProfileImages([data.photoURL]);
          }
          setIsAdmin(data.email === import.meta.env.VITE_ADMIN_EMAIL || data.isAdmin === true);
        }
      } catch (error: any) {
        console.error("Error fetching user profile:", error);
        toast({
          title: "Грешка",
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
      // Check username change restrictions
      if (userData.username !== newUsername) {
        if (lastUsernameChange) {
          const daysSinceLastChange = Math.floor((new Date().getTime() - lastUsernameChange.getTime()) / (1000 * 3600 * 24));
          if (daysSinceLastChange < 60) {
            toast({
              title: "Не може да промените потребителското име",
              description: `Трябва да изчакате още ${60 - daysSinceLastChange} дни преди да можете да промените потребителското си име отново.`,
              variant: "destructive"
            });
            return;
          }
        }
      }

      setLoading(true);
      const updates: any = {
        username: newUsername,
        fullName: newFullName,
        bio: newBio,
        phone: newPhone,
      };

      if (userData.username !== newUsername) {
        updates.lastUsernameChange = new Date().toISOString();
      }

      if (profileImages.length > 0) {
        updates.photoURL = profileImages[0];
        await updateProfile(user, { photoURL: profileImages[0] });
      }

      await updateDoc(doc(db, "users", user.uid), updates);

      toast({ 
        title: "Успешно", 
        description: "Профилът е обновен успешно" 
      });

      setUserData(prev => ({
        ...prev,
        ...updates
      }));

      if (userData.username !== newUsername) {
        setLastUsernameChange(new Date());
      }

      setIsUploadingPhoto(false);
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

  const formatDate = (date: string | Date) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return format(dateObj, 'dd MMMM yyyy', { locale: bg });
    } catch (error) {
      return 'Няма дата';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {isAdmin && <AdminPanel />}

        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <Avatar className="h-32 w-32 border-4 border-primary/20">
                <AvatarImage src={profileImages[0] || userData.photoURL} />
                <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                  {userData.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold flex items-center gap-2 justify-center">
                {userData.username}
                {isAdmin && (
                  <Badge variant="secondary" className="bg-primary/10">
                    Администратор
                  </Badge>
                )}
              </CardTitle>
              <div className="flex flex-col items-center gap-2">
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{userData.email}</span>
                </div>
                {userData.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{userData.phone}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-lg font-medium">Рейтинг: {averageRating.toFixed(1)}</span>
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
                <p className="mt-4 text-muted-foreground max-w-lg mx-auto">{userData.bio}</p>
              )}
            </div>
          </CardHeader>
        </Card>

        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle>Редактиране на профил</CardTitle>
            <CardDescription>
              Променете информацията за вашия профил тук. Имайте предвид, че потребителското име
              може да бъде променено само веднъж на 60 дни.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">
                  Потребителско име
                  {lastUsernameChange && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (последна промяна: {formatDate(lastUsernameChange)})
                    </span>
                  )}
                </Label>
                <Input
                  id="username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Въведете ново потребителско име"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Име и фамилия</Label>
                <Input
                  id="fullName"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Въведете вашето име и фамилия"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Въведете вашия телефон"
                  type="tel"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Профилна снимка</Label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsUploadingPhoto(!isUploadingPhoto)}
                  >
                    {isUploadingPhoto ? "Отказ" : "Промяна на снимка"}
                  </Button>
                </div>
                {isUploadingPhoto && (
                  <FileUpload
                    images={profileImages}
                    setImages={setProfileImages}
                    className="mt-2"
                  />
                )}
              </div>
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