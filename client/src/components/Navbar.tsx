import { Link } from "wouter";
import { UserMenu } from "./UserMenu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { PawPrint } from "lucide-react";

export function Navbar() {
  const { user } = useAuth();

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/">
          <a className="mr-6 flex items-center space-x-2">
            <PawPrint className="h-6 w-6 text-primary" />
            <span className="font-bold">DoggyCat</span>
          </a>
        </Link>
        <div className="flex flex-1 items-center justify-between">
          <nav className="flex items-center space-x-6">
            <Link href="/listings">
              <a className="text-sm font-medium transition-colors hover:text-primary">
                Намери любимец
              </a>
            </Link>
            {user && (
              <Link href="/create-listing">
                <a className="text-sm font-medium transition-colors hover:text-primary">
                  Създай обява
                </a>
              </Link>
            )}
          </nav>
          <div className="flex items-center space-x-4">
            {user ? (
              <UserMenu />
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Вход</Button>
                </Link>
                <Link href="/register">
                  <Button>Регистрация</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}