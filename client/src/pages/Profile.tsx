import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
        setNewEmail(user.email || "");
        setNewUsername(userDoc.data().username || "");
      }
    };

    fetchUserData();
  }, [user]);

  const handleEmailChange = async () => {
    if (!user || !newEmail || !currentPassword) return;

    try {
      setLoading(true);
      const credential = EmailAuthProvider.credential(
        user.email!,
        currentPassword
      );

      await reauthenticateWithCredential(user, credential);
      await updateEmail(user, newEmail);
      await updateDoc(doc(db, "users", user.uid), { email: newEmail });

      toast({ title: "Успешно", description: "Имейлът е променен успешно" });
      setCurrentPassword("");
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

  const handleUsernameChange = async () => {
    if (!user || !newUsername) return;

    try {
      setLoading(true);
      await updateProfile(user, { displayName: newUsername });
      await updateDoc(doc(db, "users", user.uid), { username: newUsername });
      toast({ title: "Успешно", description: "Потребителското име е променено успешно" });
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
                <AvatarImage src={userData.photoURL} />
                <AvatarFallback className="text-2xl">
                  {userData.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-2xl">{userData.username}</CardTitle>
            <p className="text-muted-foreground">{userData.email}</p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Промяна на имейл</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Текуща парола</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Въведете текущата парола"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Нов имейл</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Въведете нов имейл"
              />
            </div>
            <Button 
              onClick={handleEmailChange} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Промяна...
                </>
              ) : (
                "Промени имейл"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Промяна на потребителско име</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-username">Ново потребителско име</Label>
              <Input
                id="new-username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Въведете ново потребителско име"
              />
            </div>
            <Button 
              onClick={handleUsernameChange} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Промяна...
                </>
              ) : (
                "Промени потребителско име"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}