import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { CookieConsent } from "@/components/CookieConsent";
import { Navbar } from "./components/Navbar";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import CreateListing from "./pages/CreateListing";
import Listings from "./pages/Listings";
import ListingDetail from "./pages/ListingDetail";
import Chat from "./pages/Chat";
import Messages from "./pages/Messages";
import NotFound from "./pages/not-found";
import MyListings from "./pages/MyListings";
import Settings from "./pages/Settings";
import UserProfile from "./pages/UserProfile";

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
            <Route path="/listings/:id/edit" component={CreateListing} />
            <Route path="/chat/:chatId" component={Chat} />
            <Route path="/messages" component={Messages} />
            <Route path="/my-listings" component={MyListings} />
            <Route path="/settings" component={Settings} />
            <Route path="/user/:id" component={UserProfile} />
            <Route path="/:rest*" component={NotFound} />
          </Switch>
        </main>
      </div>
      <Toaster />
      <CookieConsent />
    </QueryClientProvider>
  );
}

export default App;