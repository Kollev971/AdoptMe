
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Home() {
  const { user } = useAuth();

  if (user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] p-4 text-center">
        <h1 className="text-4xl font-bold mb-4">Добре дошли в DoggyCat</h1>
        <p className="text-xl mb-8">Намерете своя перфектен домашен любимец</p>
        <Link href="/listings">
          <Button size="lg">Разгледай обявите</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] p-4 text-center">
      <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
        Намери своя перфектен
        <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"> 
          домашен любимец
        </span>
      </h1>
      <p className="mx-auto mt-4 max-w-[700px] text-gray-500 md:text-xl">
        Дай дом на животни в нужда. Разгледай наличните любимци или публикувай обява за осиновяване.
      </p>
      <div className="mt-8">
        <Link href="/auth">
          <Button size="lg">Вход / Регистрация</Button>
        </Link>
      </div>
    </div>
  );
}
