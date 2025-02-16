import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import AdoptionCounter from "@/components/AdoptionCounter";

export default function Home() {
  const { user } = useAuth();

  const MainContent = () => (
    <div 
      className="bg-cover bg-center w-full min-h-screen relative"
      style={{ 
        backgroundImage: `url("/main-web-photo.png?t=${Date.now()}")`,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        minHeight: '100vh',
        width: '100%',
        height: '100%',
        padding: '0 1rem'
      }}
    >
      <link rel="preload" as="image" href="/main-web-photo.png" />
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 w-full h-full flex flex-col justify-between px-6 lg:px-12 pt-32 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start max-w-7xl mx-auto w-full">
          <div className="md:w-1/2 text-left w-full md:mt-0 mt-[45vh]">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.8 }}
              className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6"
            >
              Осинови любов
            </motion.h1>
            <p className="text-lg md:text-xl text-white max-w-xl font-normal mb-8" style={{ fontFamily: 'Noah, sans-serif' }}> 
              AdoptMe свързва бездомни животни с хора търсещи домашен любимец. Помогни на животно да получи дом, като осиновиш или намериш осиновител.
            </p>
          </div>

          <div className="md:w-1/3 mt-8 md:mt-0">
            <div className="flex flex-col items-center justify-center">
              <AdoptionCounter />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-6 mt-auto w-full">
          <Link href="/listings">
            <Button 
              size="lg" 
              className="w-full sm:w-auto px-8 py-3 text-lg rounded-full shadow-lg hover:scale-105 transition bg-yellow-400 text-black font-semibold"
            >
              Разгледай обявите
            </Button>
          </Link>
          <Link href={user ? "/create-listing" : "/auth"}>
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