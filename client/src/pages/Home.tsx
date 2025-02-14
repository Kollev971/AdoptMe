import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function Home() {
  const { user } = useAuth();

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.8 }}
              className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl"
            >
              Добре дошли в <span style={{ color: "#004AAD" }}>Adopt</span><span style={{ color: "#01BFFF" }}>Me</span>
            </motion.h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Намерете своя перфектен домашен любимец или помогнете на животно в нужда да намери своя дом.
            </p>
            <p className="text-primary font-semibold mt-2">"Всяко животно заслужава любов и грижа!"</p>
            <div className="mt-10 flex gap-6 justify-center">
              <Link href="/listings">
                <Button size="lg" className="button-gradient text-white px-8 py-3 rounded-full shadow-lg hover:scale-105 transition">
                  Разгледай обявите
                </Button>
              </Link>
              <Link href="/create-listing">
                <Button size="lg" variant="outline" className="px-8 py-3 rounded-full shadow-md hover:shadow-lg">
                  Добави обява
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white rounded-xl shadow-sm p-6 card-hover">
              <div className="text-primary text-2xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold mb-2">Лесно търсене</h3>
              <p className="text-gray-600">Намерете своя идеален домашен любимец с нашата интуитивна система за търсене.</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 card-hover">
              <div className="text-primary text-2xl mb-4">💌</div>
              <h3 className="text-lg font-semibold mb-2">Директни съобщения</h3>
              <p className="text-gray-600">Свържете се директно със собствениците и обсъдете осиновяването.</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 card-hover">
              <div className="text-primary text-2xl mb-4">❤️</div>
              <h3 className="text-lg font-semibold mb-2">Спаси живот</h3>
              <p className="text-gray-600">Дайте шанс за нов живот на животно в нужда.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8 }}
          className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl md:text-7xl"
        >
          Намери своя перфектен
          <span className="block" style={{ color: "#004AAD" }}> домашен</span> <span className="block" style={{ color: "#01BFFF" }}>любимец</span>
        </motion.h1>
        <p className="mt-6 max-w-lg mx-auto text-lg text-gray-500 sm:max-w-3xl">
          Дай дом на животни в нужда. Разгледай наличните любимци или публикувай обява за осиновяване.
        </p>
        <div className="mt-10">
          <Link href="/auth">
            <Button size="lg" className="button-gradient text-white px-8 py-3 rounded-full shadow-lg hover:scale-105 transition">
              Вход / Регистрация
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}