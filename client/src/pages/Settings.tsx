import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { Shield, Loader2 } from "lucide-react";


export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async () => {
    const isGoogleUser = user?.providerData[0]?.providerId === 'google.com';

    if (isGoogleUser) {
      toast({
        title: "Промяна на парола не е възможна",
        description: "Влезли сте с Google акаунт. Моля, използвайте настройките на вашия Google акаунт за промяна на паролата.",
        variant: "destructive"
      });
      return;
    }

    if (!user || !oldPassword || !newPassword || newPassword !== confirmPassword) {
      toast({ 
        title: "Грешка", 
        description: "Моля, попълнете всички полета правилно", 
        variant: "destructive" 
      });
      return;
    }

    try {
      setLoading(true);
      const credential = EmailAuthProvider.credential(user.email!, oldPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      toast({ title: "Успешно", description: "Паролата е променена успешно" });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
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

  const isGoogleUser = user?.providerData[0]?.providerId === 'google.com';

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Настройки</h1>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <CardTitle>Промяна на парола</CardTitle>
            </div>
            <CardDescription>
              {isGoogleUser 
                ? "Тъй като използвате Google акаунт, промяната на парола трябва да се извърши през настройките на вашия Google акаунт." 
                : "Променете паролата си като въведете текущата и новата парола"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isGoogleUser ? (
              <Button
                className="w-full"
                onClick={() => window.open('https://myaccount.google.com/signinoptions/password', '_blank')}
              >
                Отворете настройките на Google акаунта
              </Button>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="old-password">Текуща парола</Label>
                  <Input
                    id="old-password"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Въведете текущата парола"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Нова парола</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Въведете нова парола"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Потвърдете паролата</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Потвърдете новата парола"
                  />
                </div>
                <Button 
                  onClick={handlePasswordChange} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Промяна...
                    </>
                  ) : (
                    "Промени парола"
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}