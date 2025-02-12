import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "./components/Navbar";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import CreateListing from "./pages/CreateListing";
import Listings from "./pages/Listings";
import ListingDetail from "./pages/ListingDetail";
import Chat from "./pages/Chat"; // Добавяме страницата за чат
import NotFound from "./pages/not-found";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container py-6">
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/auth" component={Auth} />
            <Route path="/profile" component={Profile} />
            <Route path="/create-listing" component={CreateListing} />
            <Route path="/listings" component={Listings} />
            <Route path="/listings/:id" component={ListingDetail} />
            <Route path="/chat/:chatId" component={Chat} /> {/* Нов маршрут за чата */}
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
