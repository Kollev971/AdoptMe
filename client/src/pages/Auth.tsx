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
import { registerUser, loginUser } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { userSchema } from "@shared/schema";

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

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

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
      const userCredential = await registerUser(data.email, data.password);

      const userData = {
        uid: userCredential.uid,
        username: data.username,
        email: data.email,
        fullName: data.fullName,
        phone: data.phone,
        createdAt: new Date().toISOString(),
        emailVerified: false,
      };

      await setDoc(doc(db, "users", userCredential.uid), userData);

      toast({
        title: "Успешна регистрация! 🎉",
        description: "Моля, проверете вашия имейл за потвърждение и след това влезте в акаунта си.",
        duration: 6000, // Show for 6 seconds
      });

      registerForm.reset();
      setRegistrationSuccess(true);
      setActiveTab("login");

      // Auto-fill login form with registration email
      loginForm.setValue("email", data.email);

    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Грешка при регистрация",
        description: error.message,
        variant: "destructive",
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
          description: "Моля, потвърдете вашия имейл преди да влезете в акаунта си",
          variant: "destructive",
        });
        return;
      }

      setLocation("/");
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
                </form>
              </Form>
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}