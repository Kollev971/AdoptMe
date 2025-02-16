import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import AdoptionCounter from "@/components/AdoptionCounter";

export default function Home() {
  const { user } = useAuth();

  const MainContent = () => (
    <div 
      className="bg-cover bg-center bg-no-repeat w-full min-h-screen pt-20" 
      style={{ 
        backgroundImage: 'url("/main-web-photo.png")',
        backgroundPosition: 'center center',  // Центрираме изображението
      }}
    >
      <div className="w-full h-full flex flex-col justify-center px-0 sm:px-0 lg:px-0 py-0">
        <div className="flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto">
          {/* Title and subtitle container aligned to the far left */}
          <div className="md:w-1/2 text-left pl-0 ml-0 flex flex-col justify-start">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.8 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4"
            >
              Осинови любов
            </motion.h1>
            <p className="text-base md:text-lg text-white max-w-xl font-normal mb-0" style={{ fontFamily: 'Noah, sans-serif' }}> 
              Намери дом на бездомно животно: осинови или намери осиновители.
              AdoptMe ти свързва с животни, търсещи своето "вкъщи" и със стопани, търсещи своя бъдещ любимец.
            </p>
          </div>

          {/* Simplified Adoption Counter with no background */}
          <div className="md:w-1/3 text-center md:text-right pr-8 mt-8 md:mt-0">
            <div className="flex flex-col items-center justify-center text-gray-800">
              <span className="text-lg font-semibold mb-4">Обяви за осиновяване</span>
              <div className="text-3xl font-bold text-[#FF7A00]">
                <AdoptionCounter />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative flex flex-col">
      {/* Background image */}
      <MainContent />

      <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex flex-col sm:flex-row gap-6 w-full px-6">
        {!user ? (
          <>
            {/* For non-logged in users: show both buttons */}
            <Link href="/listings">
              <Button 
                size="lg" 
                className="w-full sm:w-auto px-8 py-3 text-base rounded-full shadow-lg hover:scale-105 transition bg-yellow-400 text-black"
              >
                Разгледай обявите
              </Button>
            </Link>
            <Link href="/create-listing">
              <Button 
                size="lg" 
                className="w-full sm:w-auto px-8 py-3 text-base rounded-full shadow-lg hover:scale-105 transition bg-white text-black"
              >
                Добави обява
              </Button>
            </Link>
          </>
        ) : (
          <>
            {/* For logged-in users, show other options */}
            <Link href="/listings">
              <Button 
                size="lg" 
                className="w-full sm:w-auto px-8 py-3 text-base rounded-full shadow-lg hover:scale-105 transition bg-yellow-400 text-black"
              >
                Разгледай обявите
              </Button>
            </Link>
            <Link href="/create-listing">
              <Button 
                size="lg" 
                className="w-full sm:w-auto px-8 py-3 text-base rounded-full shadow-lg hover:scale-105 transition bg-white text-black"
              >
                Добави обява
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
