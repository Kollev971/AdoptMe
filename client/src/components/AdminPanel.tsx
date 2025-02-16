import { useState, useEffect } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Shield, Users, MessageSquare, PawPrint, ChevronDown, ChevronUp, Activity, Calendar, Clock } from "lucide-react";

interface AdoptionRequest {
  id: string;
  listingId: string;
  status: string;
  createdAt: string;
}

interface AdminStats {
  totalUsers: number;
  totalListings: number;
  totalChats: number;
  totalAdoptions: number;
  activeListings: number;
  recentActivity: number;
  totalVisitors: number;
  successRate: number;
  averageResponseTime: number;
  mostActiveUsers: string[];
  popularPetTypes: Record<string, number>;
  weeklyStats: any[];
}

export default function AdminPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalListings: 0,
    totalChats: 0,
    totalAdoptions: 0,
    activeListings: 0,
    recentActivity: 0,
    totalVisitors: 0,
    successRate: 0,
    averageResponseTime: 0,
    mostActiveUsers: [],
    popularPetTypes: {},
    weeklyStats: []
  });
  const [adoptions, setAdoptions] = useState<AdoptionRequest[]>([]);

  const fetchAdoptions = async () => {
    const adoptionsQuery = query(
      collection(db, "adoptionRequests"),
      where("status", "==", "completed")
    );
    const adoptionsSnap = await getDocs(adoptionsQuery);
    setAdoptions(adoptionsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AdoptionRequest)));
  };

  const handleStatusChange = async (adoptionId: string, newStatus: string) => {
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
      if (!isOpen) return;

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

        // Calculate success rate
        const totalAdoptionRequests = adoptions.size;
        const successRate = totalAdoptionRequests > 0 
          ? (adoptions.size / totalAdoptionRequests) * 100 
          : 0;

        setStats({
          totalUsers: users.size,
          totalListings: listings.size,
          totalChats: chats.size,
          totalAdoptions: adoptions.size,
          activeListings: activeListings.size,
          recentActivity: recentActivity.size,
          totalVisitors: 0, // This would need analytics integration
          successRate: Math.round(successRate),
          averageResponseTime: 0, // This would need chat timestamp analysis
          mostActiveUsers: [],
          popularPetTypes: {},
          weeklyStats: []
        });

        await fetchAdoptions();
      } catch (error) {
        console.error("Error fetching admin stats:", error);
      }
    };

    fetchStats();
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
              {/* Stats cards */}
              <StatsCard icon={<Users />} label="Общо потребители" value={stats.totalUsers} />
              <StatsCard icon={<PawPrint />} label="Активни обяви" value={stats.activeListings} />
              <StatsCard icon={<MessageSquare />} label="Активни чатове" value={stats.totalChats} />
              <StatsCard icon={<PawPrint />} label="Успешни осиновявания" value={stats.totalAdoptions} />
              <StatsCard icon={<Activity />} label="Нови обяви (7 дни)" value={stats.recentActivity} />
              <StatsCard icon={<Calendar />} label="Общо обяви" value={stats.totalListings} />
              <StatsCard icon={<Users />} label="Общо посетители" value={stats.totalVisitors} />
              <StatsCard icon={<Activity />} label="Успеваемост" value={`${stats.successRate}%`} />
              <StatsCard icon={<Clock />} label="Средно време за отговор" value={`${stats.averageResponseTime} мин.`} />
            </div>

            {/* Adoptions list */}
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

function StatsCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 dark:bg-primary/10">
      <div className="w-8 h-8 text-primary flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
    </div>
  );
}