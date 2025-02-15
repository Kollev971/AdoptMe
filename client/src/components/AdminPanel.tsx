import { useState, useEffect } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Users, MessageSquare, PawPrint } from "lucide-react";

export default function AdminPanel() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalListings: 0,
    totalChats: 0,
    totalAdoptions: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [users, listings, chats, adoptions] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "listings")),
          getDocs(collection(db, "chats")),
          getDocs(query(collection(db, "adoptionRequests"), where("status", "==", "completed")))
        ]);

        setStats({
          totalUsers: users.size,
          totalListings: listings.size,
          totalChats: chats.size,
          totalAdoptions: adoptions.size
        });
      } catch (error) {
        console.error("Error fetching admin stats:", error);
      }
    };

    fetchStats();
  }, []);

  return (
    <Card className="bg-white/50 backdrop-blur-lg border-none shadow-xl dark:bg-zinc-900/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Admin Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 dark:bg-primary/10">
            <Users className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-semibold">{stats.totalUsers}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 dark:bg-primary/10">
            <PawPrint className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Active Listings</p>
              <p className="text-2xl font-semibold">{stats.totalListings}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 dark:bg-primary/10">
            <MessageSquare className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Active Chats</p>
              <p className="text-2xl font-semibold">{stats.totalChats}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 dark:bg-primary/10">
            <PawPrint className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Successful Adoptions</p>
              <p className="text-2xl font-semibold">{stats.totalAdoptions}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
