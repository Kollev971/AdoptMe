import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import AdoptionCounter from "@/components/AdoptionCounter";

export default function Home() {
  const { user } = useAuth();

  const MainContent = () => (
    <div className="relative min-h-screen">
      <div 
        className="absolute inset-0 top-16 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url("/main-web-photo.png")',
        }}
      >
        <div className="w-full h-full flex flex-col">
          <div className="container flex flex-col md:flex-row justify-between items-center py-12">
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
            </div>
            <div className="md:w-1/3">
              <AdoptionCounter />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex flex-col sm:flex-row gap-6">
        {!user ? (
          <Link href="/auth">
            <Button 
              size="lg" 
              className="w-full sm:w-auto px-8 py-3 text-base rounded-full shadow-lg hover:scale-105 transition bg-[#FFD43B] hover:bg-[#FFD43B]/90 text-black"
            >
              Вход / Регистрация
            </Button>
          </Link>
        ) : (
          <>
            <Link href="/listings">
              <Button 
                size="lg" 
                className="w-full sm:w-auto px-8 py-3 text-base rounded-full shadow-lg hover:scale-105 transition bg-[#FFD43B] hover:bg-[#FFD43B]/90 text-black"
              >
                Разгледай обявите
              </Button>
            </Link>
            <Link href="/create-listing">
              <Button 
                size="lg" 
                className="w-full sm:w-auto px-8 py-3 text-base rounded-full shadow-lg hover:scale-105 transition bg-[#FFF5E1] hover:bg-[#FFF5E1]/90 text-black"
              >
                Добави обява
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );

  return <MainContent />;
}