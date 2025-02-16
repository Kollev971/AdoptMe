import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import AdoptionCounter from "@/components/AdoptionCounter";

export default function Home() {
  const { user } = useAuth();

  if (user) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div 
            className="text-left p-8 rounded-2xl bg-cover bg-center bg-no-repeat mb-12 min-h-[70vh] relative flex flex-col justify-between"
            style={{ 
              backgroundImage: 'url("/main-web-photo.png")',
              backgroundSize: 'cover'
            }}
          >
            <div className="flex flex-col md:flex-row justify-between items-start">
              <div className="md:w-1/2">
                <motion.h1 
                  initial={{ opacity: 0, y: -20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.8 }}
                  className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white"
                >
                  Осинови любов
                </motion.h1>
                <p className="mt-2 text-sm md:text-base text-white md:mt-2 max-w-md font-normal" style={{ fontFamily: 'Noah, sans-serif' }}> 
                  Намери дом на бездомно животно: осинови или намери осиновители.
                  AdoptMe ти свързва с животни, търсещи своето "вкъщи" и със стопани, търсещи своя бъдещ любимец.
                </p>
              </div>
              <div className="md:w-1/3 mt-4 md:mt-0">
                <AdoptionCounter />
              </div>
            </div>

            <div className="mt-6 sm:mt-10 flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
              <Link href="/listings">
                <Button size="lg" className="w-full sm:w-auto button-gradient text-white px-6 sm:px-8 py-2 sm:py-3 rounded-full shadow-lg hover:scale-105 transition">
                  Разгледай обявите
                </Button>
              </Link>
              <Link href="/create-listing">
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 rounded-full shadow-md hover:shadow-lg bg-white text-[#D89EAA] hover:bg-white/90">
                  Добави обява
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-12 sm:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 card-hover">
              <div className="text-primary text-xl sm:text-2xl mb-3 sm:mb-4">🔍</div>
              <h3 className="text-base sm:text-lg font-semibold mb-2">Лесно търсене</h3>
              <p className="text-sm sm:text-base text-gray-600">Намерете своя идеален домашен любимец с нашата интуитивна система за търсене.</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 card-hover">
              <div className="text-primary text-xl sm:text-2xl mb-3 sm:mb-4">💌</div>
              <h3 className="text-base sm:text-lg font-semibold mb-2">Директни съобщения</h3>
              <p className="text-sm sm:text-base text-gray-600">Свържете се директно със собствениците и обсъдете осиновяването.</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 card-hover">
              <div className="text-primary text-xl sm:text-2xl mb-3 sm:mb-4">❤️</div>
              <h3 className="text-base sm:text-lg font-semibold mb-2">Спаси живот</h3>
              <p className="text-sm sm:text-base text-gray-600">Дайте шанс за нов живот на животно в нужда.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        <div className="flex flex-col md:flex-row justify-between items-start">
          <div className="md:w-1/2">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.8 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900"
            >
              Намери своя перфектен
              <span className="block mt-2" style={{ color: "#DBC63F" }}> домашен</span>
              <span className="block mt-2" style={{ color: "#D89EAA" }}>любимец</span>
            </motion.h1>
            <p className="mt-4 sm:mt-6 max-w-lg text-base sm:text-lg text-gray-500">
              Дай дом на животни в нужда. Разгледай наличните любимци или публикувай обява за осиновяване.
            </p>
            <div className="mt-6 sm:mt-10">
              <Link href="/auth">
                <Button size="lg" className="w-full sm:w-auto button-gradient text-white px-6 sm:px-8 py-2 sm:py-3 rounded-full shadow-lg hover:scale-105 transition">
                  Вход / Регистрация
                </Button>
              </Link>
            </div>
          </div>
          <div className="md:w-1/3 mt-8 md:mt-0">
            <AdoptionCounter />
          </div>
        </div>
      </div>
    </div>
  );
}