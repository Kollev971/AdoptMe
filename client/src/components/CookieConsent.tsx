
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

export function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setShowConsent(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setShowConsent(false);
  };

  if (!showConsent) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm z-50">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Този сайт използва бисквитки, за да подобри вашето потребителско изживяване. 
              Продължавайки да използвате сайта, вие се съгласявате с използването на бисквитки 
              съгласно нашата политика за поверителност.
            </p>
            <Button onClick={acceptCookies} className="whitespace-nowrap">
              Приемам
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
