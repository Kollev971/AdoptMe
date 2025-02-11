import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
      <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
        Намери своя перфектен
        <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"> 
          домашен любимец
        </span>
      </h1>

      <p className="mx-auto mt-4 max-w-[700px] text-gray-500 md:text-xl">
        Дай дом на животни в нужда. Разгледай наличните любимци или публикувай обява за осиновяване.
      </p>

      <div className="mt-8 flex gap-4">
        <Link href="/listings">
          <Button size="lg">Разгледай любимци</Button>
        </Link>
        {!user && (
          <Link href="/auth">
            <Button variant="outline" size="lg">Регистрирай се</Button>
          </Link>
        )}
      </div>
    </div>
  );
}