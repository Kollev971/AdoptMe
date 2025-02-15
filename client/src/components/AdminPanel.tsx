
import { useState, useEffect } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Shield, Users, MessageSquare, PawPrint, ChevronDown, ChevronUp, Activity, Calendar } from "lucide-react";

export default function AdminPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalListings: 0,
    totalChats: 0,
    totalAdoptions: 0,
    activeListings: 0,
    recentActivity: 0
  });
  const [adoptions, setAdoptions] = useState([]);

  const fetchAdoptions = async () => {
    const adoptionsQuery = query(
      collection(db, "adoptionRequests"),
      where("status", "==", "completed"),
      orderBy("createdAt", "desc")
    );
    const adoptionsSnap = await getDocs(adoptionsQuery);
    setAdoptions(adoptionsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })));
  };

  const handleStatusChange = async (adoptionId, newStatus) => {
    try {
      await updateDoc(doc(db, "adoptionRequests", adoptionId), {
        status: newStatus
      });
      await fetchAdoptions();
    } catch (error) {
      console.error("Error updating adoption status:", error);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [users, listings, chats, adoptions, activeListings] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "listings")),
          getDocs(collection(db, "chats")),
          getDocs(query(collection(db, "adoptionRequests"), where("status", "==", "completed"))),
          getDocs(query(collection(db, "listings"), where("status", "==", "available")))
        ]);

        // Get recent activity (last 7 days)
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const recentActivityQuery = query(
          collection(db, "listings"),
          where("createdAt", ">=", lastWeek.toISOString())
        );
        const recentActivity = await getDocs(recentActivityQuery);

        setStats({
          totalUsers: users.size,
          totalListings: listings.size,
          totalChats: chats.size,
          totalAdoptions: adoptions.size,
          activeListings: activeListings.size,
          recentActivity: recentActivity.size
        });
      } catch (error) {
        console.error("Error fetching admin stats:", error);
      }
    };

    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span>Админ Панел</span>
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-2 bg-white/50 backdrop-blur-lg border-none shadow-xl dark:bg-zinc-900/50">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 dark:bg-primary/10">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Общо потребители</p>
                  <p className="text-2xl font-semibold">{stats.totalUsers}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 dark:bg-primary/10">
                <PawPrint className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Активни обяви</p>
                  <p className="text-2xl font-semibold">{stats.activeListings}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 dark:bg-primary/10">
                <MessageSquare className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Активни чатове</p>
                  <p className="text-2xl font-semibold">{stats.totalChats}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 dark:bg-primary/10">
                <PawPrint className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Успешни осиновявания</p>
                  <p className="text-2xl font-semibold">{stats.totalAdoptions}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 dark:bg-primary/10">
                <Activity className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Нови обяви (7 дни)</p>
                  <p className="text-2xl font-semibold">{stats.recentActivity}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 dark:bg-primary/10">
                <Calendar className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Общо обяви</p>
                  <p className="text-2xl font-semibold">{stats.totalListings}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Осиновявания</h3>
              <div className="space-y-4">
                {adoptions.map((adoption) => (
                  <div key={adoption.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
                    <div>
                      <p>ID: {adoption.listingId}</p>
                      <p>Дата: {new Date(adoption.createdAt).toLocaleDateString()}</p>
                    </div>
                    <select
                      value={adoption.status}
                      onChange={(e) => handleStatusChange(adoption.id, e.target.value)}
                      className="border rounded p-2"
                    >
                      <option value="completed">Осиновен</option>
                      <option value="cancelled">Отказано</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
