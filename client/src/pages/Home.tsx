import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Home() {
  const { user } = useAuth();

  if (user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gray-100">
        <div className="w-full max-w-4xl bg-white p-8 rounded-lg shadow-lg text-center">
          <h1 className="text-4xl font-bold mb-4">Добре дошли в DoggyCat</h1>
          <p className="text-xl mb-8">Намерете своя перфектен домашен любимец</p>
          <div className="flex gap-4 justify-center">
            <Link href="/listings">
              <Button size="lg" variant="default">Разгледай обявите</Button>
            </Link>
            <Link href="/create-listing">
              <Button size="lg" variant="outline">Добави обява</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gray-100">
      <div className="w-full max-w-4xl bg-white p-8 rounded-lg shadow-lg text-center">
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
    </div>
  );
}
