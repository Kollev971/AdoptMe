import { Link } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import type { Listing } from "@shared/schema";

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const formatAge = (age: number) => {
    if (age < 1) {
      const months = Math.round(age * 12);
      return `${months} month${months === 1 ? '' : 's'}`;
    }
    return `${age} year${age === 1 ? '' : 's'}`;
  };

  return (
    <Link href={`/listings/${listing.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        <CardContent className="p-0">
          <AspectRatio ratio={4/3}>
            <img
              src={listing.images[0] || 'https://via.placeholder.com/400x300?text=No+Image'}
              alt={listing.title}
              className="object-cover w-full h-full"
            />
          </AspectRatio>
          <div className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-lg line-clamp-1">{listing.title}</h3>
              <Badge variant="secondary" className="capitalize">
                {listing.type}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mb-2">
              Age: {formatAge(listing.age)}
            </p>
            <p className="text-sm text-gray-600 line-clamp-2">
              {listing.description}
            </p>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <div className="text-sm text-gray-500">
            Listed on {new Date(listing.createdAt).toLocaleDateString()}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
