import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import AdoptionCounter from "@/components/AdoptionCounter";

export default function Home() {
  const { user } = useAuth();

  const MainContent = () => (
    <div 
      className="bg-cover bg-center bg-fixed w-full min-h-screen relative"
      style={{ 
        backgroundImage: 'url("/main-web-photo.png")',
        backgroundPosition: 'center center',
      }}
    >
      <div className="absolute inset-0 bg-black/20" /> {/* Overlay for better text readability */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between px-6 lg:px-12 py-20">
        <div className="flex flex-col md:flex-row justify-between items-start max-w-7xl mx-auto w-full">
          {/* Left side with text */}
          <div className="md:w-1/2 text-left">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.8 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6"
            >
              Осинови любов
            </motion.h1>
            <p className="text-lg md:text-xl text-white max-w-xl font-normal mb-8" style={{ fontFamily: 'Noah, sans-serif' }}> 
              Намери дом на бездомно животно: осинови или намери осиновители.
              AdoptMe ти свързва с животни, търсещи своето "вкъщи" и със стопани, търсещи своя бъдещ любимец.
            </p>
          </div>

          {/* Right side with counter */}
          <div className="md:w-1/3 mt-8 md:mt-0 bg-white/90 p-6 rounded-lg shadow-lg">
            <div className="flex flex-col items-center justify-center">
              <span className="text-xl font-semibold mb-4 text-gray-800">Обяви за осиновяване</span>
              <div className="text-4xl font-bold text-[#FF7A00]">
                <AdoptionCounter />
              </div>
            </div>
          </div>
        </div>

        {/* Centered buttons at the bottom */}
        <div className="flex flex-col sm:flex-row justify-center gap-6 mt-12 w-full">
          <Link href="/listings">
            <Button 
              size="lg" 
              className="w-full sm:w-auto px-8 py-3 text-lg rounded-full shadow-lg hover:scale-105 transition bg-yellow-400 text-black font-semibold"
            >
              Разгледай обявите
            </Button>
          </Link>
          <Link href="/create-listing">
            <Button 
              size="lg" 
              className="w-full sm:w-auto px-8 py-3 text-lg rounded-full shadow-lg hover:scale-105 transition bg-white text-black font-semibold"
            >
              Добави обява
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );

  return <MainContent />;
}