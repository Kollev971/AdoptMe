import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { auth, loginUser, signInWithGoogle } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { Loader2, ArrowLeft } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Невалиден имейл адрес"),
  password: z.string().min(6, "Паролата трябва да е поне 6 символа"),
});

const resetSchema = z.object({
  email: z.string().email("Невалиден имейл адрес"),
});

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isResetMode, setIsResetMode] = useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: "",
    },
  });

  const [resetSuccess, setResetSuccess] = useState(false);

  const handlePasswordReset = async (data: z.infer<typeof resetSchema>) => {
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, data.email);
      setResetSuccess(true);
      toast({
        title: "Успешно изпратен имейл",
        description: "Проверете пощата си за инструкции за възстановяване на паролата",
      });
      setTimeout(() => {
        setIsResetMode(false);
        setResetSuccess(false);
      }, 3000);
      resetForm.reset();
    } catch (error: any) {
      toast({
        title: "Грешка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    try {
      setLoading(true);
      const user = await loginUser(data.email, data.password);

      if (!user.emailVerified) {
        toast({
          title: "Имейлът не е потвърден",
          description: "Моля, потвърдете вашия имейл преди да влезете",
          variant: "destructive",
        });
        return;
      }

      setLocation("/");
    } catch (error: any) {
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
    <div className="flex justify-center items-center min-h-[calc(100vh-4rem)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isResetMode ? "Възстановяване на парола" : "Вход"}</CardTitle>
          {isResetMode && (
            <CardDescription>
              Въведете имейл адреса си, за да получите линк за възстановяване на паролата
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {isResetMode ? (
            <div className="space-y-4">
              <Form {...resetForm}>
                <form onSubmit={resetForm.handleSubmit(handlePasswordReset)} className="space-y-4">
                  <FormField
                    control={resetForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Имейл</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="Въведете вашия имейл"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Изпращане...
                        </>
                      ) : (
                        "Изпрати линк за възстановяване"
                      )}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setIsResetMode(false)}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Обратно към вход
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          ) : (
            <>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onSubmit)} className="space-y-4">
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
                        <div className="space-y-2">
                          <FormControl>
                            <Input type="password" placeholder="Въведете вашата парола" {...field} />
                          </FormControl>
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="link"
                              className="h-auto p-0 text-sm"
                              onClick={() => setIsResetMode(true)}
                            >
                              Забравена парола?
                            </Button>
                          </div>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Влизане...
                      </>
                    ) : (
                      "Влез"
                    )}
                  </Button>
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
                      setLocation("/");
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}