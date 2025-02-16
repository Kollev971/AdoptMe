import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { registerUser, loginUser, signInWithGoogle } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { userSchema } from "@shared/schema";
import { Check, X } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";

// First omit the auto-generated fields, then extend with password fields, then add refinement
const registerFormSchema = userSchema
  .omit({ 
    uid: true, 
    emailVerified: true, 
    createdAt: true, 
    photoURL: true 
  })
  .extend({
    password: z.string().min(6, "Паролата трябва да е поне 6 символа"),
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Паролите не съвпадат",
    path: ["confirmPassword"],
  });

const loginSchema = z.object({
  email: z.string().email("Невалиден имейл адрес"),
  password: z.string().min(6, "Паролата трябва да е поне 6 символа"),
});

// Add password validation helper
const PasswordRequirements = ({ password }: { password: string }) => {
  const requirements = [
    { text: "Поне 8 символа", test: (p: string) => p.length >= 8 },
    { text: "Поне една главна буква", test: (p: string) => /[A-Z]/.test(p) },
    { text: "Поне една малка буква", test: (p: string) => /[a-z]/.test(p) },
    { text: "Поне една цифра", test: (p: string) => /[0-9]/.test(p) },
    { text: "Поне един специален символ", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];

  return (
    <div className="space-y-2 text-sm">
      {requirements.map((req, index) => (
        <div key={index} className="flex items-center gap-2">
          {req.test(password) ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <X className="h-4 w-4 text-destructive" />
          )}
          <span className={req.test(password) ? "text-green-500" : "text-destructive"}>
            {req.text}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");

  const registerForm = useForm<z.infer<typeof registerFormSchema>>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: "",
      email: "",
      fullName: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  const onRegister = async (data: z.infer<typeof registerFormSchema>) => {
    try {
      setLoading(true);

      // First create the Firebase auth user
      const userCredential = await registerUser(data.email, data.password);

      // Prepare user data for Firestore
      const userData = {
        uid: userCredential.uid,
        username: data.username,
        email: data.email,
        fullName: data.fullName,
        phone: data.phone,
        createdAt: new Date().toISOString(),
        emailVerified: false,
      };

      // Save user data to Firestore
      await setDoc(doc(db, "users", userCredential.uid), userData);

      // Show success message and handle redirection
      toast({
        title: "Успешна регистрация! 🎉",
        description: "Изпратихме ви имейл за потвърждение. Моля, проверете пощата си.",
        duration: 5000,
      });

      // Reset form
      registerForm.reset();

      // Wait a bit to show the toast before switching tabs
      loginForm.setValue("email", data.email);
      setActiveTab("login");

    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Грешка при регистрация",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const onLogin = async (data: z.infer<typeof loginSchema>) => {
    try {
      setLoading(true);
      const user = await loginUser(data.email, data.password);

      if (!user.emailVerified) {
        toast({
          title: "Имейлът не е потвърден",
          description: "Моля, потвърдете регистрацията си чрез линка, който изпратихме на имейла ви.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Успешен вход",
        description: "Добре дошли отново!",
      });

      setLocation("/profile");
    } catch (error: any) {
      toast({
        title: "Грешка при вход",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onPasswordReset = async (email: string) => {
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Имейл за възстановяване на паролата е изпратен",
        description: "Моля, проверете пощата си.",
      });
    } catch (error: any) {
      toast({
        title: "Грешка при изпращане на имейл",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-3.5rem)]">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            {activeTab === "login" ? "Вход" : "Регистрация"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Вход</TabsTrigger>
              <TabsTrigger value="register">Регистрация</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Имейл</FormLabel>
                        <FormControl>
                          <Input placeholder="Въведете вашия имейл" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Парола</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Въведете вашата парола" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Влизане..." : "Влез"}
                  </Button>
                  <div className="mt-2 text-right">
                    <a onClick={() => onPasswordReset(loginForm.getValues("email"))} href="#">Забравена парола?</a>
                  </div>
                </form>
              </Form>
              <div className="mt-4 relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    или влезте с
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => {
                  setLoading(true);
                  signInWithGoogle()
                    .then(() => {
                      setLocation("/profile");
                    })
                    .catch((error) => {
                      toast({
                        title: "Грешка",
                        description: error.message,
                        variant: "destructive",
                      });
                    })
                    .finally(() => setLoading(false));
                }}
                disabled={loading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </Button>
            </TabsContent>

            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Потребителско име</FormLabel>
                        <FormControl>
                          <Input placeholder="Изберете потребителско име" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Имейл</FormLabel>
                        <FormControl>
                          <Input placeholder="Въведете вашия имейл" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Пълно име</FormLabel>
                        <FormControl>
                          <Input placeholder="Въведете вашето пълно име" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Телефон</FormLabel>
                        <FormControl>
                          <Input placeholder="Въведете вашия телефон" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Парола</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Изберете парола" {...field} />
                        </FormControl>
                        <PasswordRequirements password={field.value} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Потвърдете паролата</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Потвърдете вашата парола" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? "Регистрация..." : "Регистрирай се"}
                  </Button>
                </form>
              </Form>
              <div className="mt-4 relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    или регистрирайте се с
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => {
                  setLoading(true);
                  signInWithGoogle()
                    .then(() => {
                      setLocation("/profile");
                    })
                    .catch((error) => {
                      toast({
                        title: "Грешка",
                        description: error.message,
                        variant: "destructive",
                      });
                    })
                    .finally(() => setLoading(false));
                }}
                disabled={loading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}