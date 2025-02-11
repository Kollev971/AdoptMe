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

const registerFormSchema = userSchema.extend({
  password: z.string().min(6, "Паролата трябва да е поне 6 символа"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
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
    mode: "onBlur", 
  });

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur", 
  });

  const onRegister = async (data: z.infer<typeof registerFormSchema>) => {
    try {
      setLoading(true);
      console.log("Starting registration process with data:", { 
        email: data.email,
        username: data.username,
        fullName: data.fullName 
      });

      const userCredential = await registerUser(data.email, data.password);
      console.log("Firebase user created:", userCredential.uid);

      const userData = {
        uid: userCredential.uid,
        username: data.username,
        email: data.email,
        fullName: data.fullName,
        phone: data.phone,
        createdAt: new Date().toISOString(),
        emailVerified: false,
      };

      console.log("Attempting to create user document in Firestore");
      await setDoc(doc(db, "users", userCredential.uid), userData);
      console.log("User document created successfully");

      toast({
        title: "Успешна регистрация",
        description: "Моля, проверете вашия имейл за потвърждение",
      });

      registerForm.reset();
      setActiveTab("login");
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
      console.log("Attempting login with:", { email: data.email });
      const user = await loginUser(data.email, data.password);

      if (!user.emailVerified) {
        toast({
          title: "Имейлът не е потвърден",
          description: "Моля, потвърдете вашия имейл преди да влезете",
          variant: "destructive",
        });
        return;
      }

      console.log("Login successful, redirecting");
      setLocation("/");
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Грешка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">DoggyCat</CardTitle>
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
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = registerForm.getValues();
                    console.log("Form submitted with values:", formData);
                    console.log("Form state:", registerForm.formState);
                    registerForm.handleSubmit(onRegister)(e);
                  }} 
                  className="space-y-4"
                >
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
                    disabled={loading || !registerForm.formState.isValid}
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