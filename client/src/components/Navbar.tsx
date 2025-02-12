
import { useAuth } from "@/hooks/useAuth";
import { PawPrint } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { UserMenu } from "./UserMenu";

export function Navbar() {
  const { user, userData, loading } = useAuth();

  if (loading) {
    return (
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="/">
            <div className="mr-6 flex items-center space-x-2">
              <PawPrint className="h-6 w-6 text-primary" />
              <span className="font-bold">DoggyCat</span>
            </div>
          </Link>
          <div className="ml-auto">
            <span className="text-muted-foreground">Зареждане...</span>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/">
          <div className="mr-6 flex items-center space-x-2">
            <PawPrint className="h-6 w-6 text-primary" />
            <span className="font-bold">DoggyCat</span>
          </div>
        </Link>

        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <Link href="/create-listing">
                <Button>Добави обява</Button>
              </Link>
              <UserMenu />
            </>
          ) : (
            <Link href="/auth">
              <Button>Вход / Регистрация</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
