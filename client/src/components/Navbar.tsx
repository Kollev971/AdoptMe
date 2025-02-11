
import { Link } from "wouter";
import { UserMenu } from "./UserMenu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { PawPrint } from "lucide-react";

export function Navbar() {
  const { user, userData, loading } = useAuth();

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/">
          <div className="mr-6 flex items-center space-x-2">
            <PawPrint className="h-6 w-6 text-primary" />
            <span className="font-bold">DoggyCat</span>
          </div>
        </Link>
        <div className="flex flex-1 items-center justify-between">
          <nav className="flex items-center space-x-6">
            <Link href="/listings">
              <span className="text-sm font-medium transition-colors hover:text-primary cursor-pointer">
                Намери любимец
              </span>
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            {!loading && (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
