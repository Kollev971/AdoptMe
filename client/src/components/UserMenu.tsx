import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function UserMenu() {
  const { userData } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setLocation("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (!userData) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={userData.photoURL || undefined} alt={userData.fullName || ''} />
            <AvatarFallback>{userData.fullName?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        {userData.fullName && (
          <DropdownMenuItem className="font-medium">
            {userData.fullName}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => setLocation("/profile")}>
          Профил
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocation("/chat")}>
          Съобщения
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout}>
          Изход
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}