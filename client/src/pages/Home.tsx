import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import AdoptionCounter from "@/components/AdoptionCounter";

export default function Home() {
  const { user } = useAuth();

  const MainContent = () => (
    <div 
      className="bg-cover bg-center bg-no-repeat min-h-[calc(100vh-4rem)]"
      style={{ 
        backgroundImage: 'url("/main-web-photo.png")',
        backgroundSize: 'cover'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="md:w-1/2 text-center md:text-left">
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
            {user && (
              <div className="flex flex-col sm:flex-row gap-6 justify-start items-center">
                <Link href="/listings">
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto px-8 py-4 text-xl font-semibold rounded-full shadow-lg hover:scale-105 transition bg-[#DBC63F] hover:bg-[#DBC63F]/90 text-black"
                  >
                    Разгледай обявите
                  </Button>
                </Link>
                <Link href="/create-listing">
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto px-8 py-4 text-xl font-semibold rounded-full shadow-lg hover:scale-105 transition bg-[#FFF5E1] hover:bg-[#FFF5E1]/90 text-black"
                  >
                    Добави обява
                  </Button>
                </Link>
              </div>
            )}
          </div>
          <div className="md:w-1/3 mt-8 md:mt-0">
            <AdoptionCounter />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {!user ? (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          <MainContent />
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2">
            <Link href="/auth">
              <Button 
                size="lg" 
                className="px-8 py-4 text-xl font-semibold rounded-full shadow-lg hover:scale-105 transition bg-[#DBC63F] hover:bg-[#DBC63F]/90 text-black"
              >
                Вход / Регистрация
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <MainContent />
      )}
    </div>
  );
}