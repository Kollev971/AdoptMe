
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">Добре дошли в DoggyCat</h1>
      <p className="text-xl mb-8">Намерете своя перфектен домашен любимец</p>
      
      {!user ? (
        <div className="space-y-4">
          <Link href="/auth">
            <Button size="lg">Вход / Регистрация</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <Link href="/create-listing">
            <Button size="lg">Добави обява</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
