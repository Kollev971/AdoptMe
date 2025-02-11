import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
      <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
        Find Your Perfect
        <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"> 
          Pet Companion
        </span>
      </h1>
      
      <p className="mx-auto mt-4 max-w-[700px] text-gray-500 md:text-xl">
        Give a loving home to pets in need. Browse available pets or list one for adoption.
      </p>

      <div className="mt-8 flex gap-4">
        <Link href="/listings">
          <Button size="lg">Browse Pets</Button>
        </Link>
        {!user && (
          <Link href="/register">
            <Button variant="outline" size="lg">Register Now</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
