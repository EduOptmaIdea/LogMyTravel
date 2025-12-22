import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// Importe as imagens (substitua pelos caminhos reais no seu projeto)
// Se estiver no Figma, use `figma:asset/...`
import splashImage from "@/assets/imagem-carro-familia.png"; // ✅ Imagem do carro
import appIcon from "@/assets/logo-do-carrousel.png"; // ✅ Logo LogMyTravel

interface SplashScreenProps {
  onReady: () => void;
}

export function SplashScreen({ onReady }: SplashScreenProps) {
  const [showLogo, setShowLogo] = useState(false);
  const [showBackground, setShowBackground] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setShowBackground(true), 150);
    const timer2 = setTimeout(() => setShowLogo(true), 400);
    const timer3 = setTimeout(onReady, 1200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onReady]);

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-screen bg-black overflow-hidden z-50 rounded-xl">
      {/* Fundo animado */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showBackground ? 1 : 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="absolute inset-0"
      >
        <img
          src={splashImage}
          alt="Fundo de viagem"
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Logo central animado */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ 
          scale: showLogo ? 1 : 0.8,
          opacity: showLogo ? 1 : 0 
        }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.25 }}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10"
      >
        <div className="bg-white rounded-xl p-8 shadow-2xl">
          <img
            src={appIcon}
            alt="LogMyTravel"
            className="w-48 h-auto"
          />
        </div>
      </motion.div>
    </div>
  );
}
