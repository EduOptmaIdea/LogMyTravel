import { useState, useEffect } from "react";
// Usa imports padrão do Vite com alias "@" para assets
import slide1 from "@/assets/logo-do-carrousel.png";
import slide2 from "@/assets/imagem-carro-familia.png";
import slide3 from "@/assets/placa-familia-viagem.png";

export function PromoCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [slide1, slide2, slide3];
  const totalSlides = slides.length;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 15000);

    return () => clearInterval(interval);
  }, [totalSlides]);

  return (
    <div className=""> {/* CORREÇÃO: Removido "px-4 py-4" para usar o espaçamento do App.tsx */}
      <div className="relative overflow-hidden rounded-xl bg-gray-100" style={{ height: '22vh', maxHeight: '200px' }}>
        <div
          className="flex transition-transform duration-500 ease-in-out h-full"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <div key={index} className="min-w-full h-full flex items-center justify-center">
              <img
                src={slide}
                alt={`Promoção ${index + 1}`}
                className="max-h-[80%] w-auto object-contain"
                onError={(e) => {
                  // Fallback visual caso a imagem não carregue (ex: fora do Figma)
                  e.currentTarget.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.className = 'text-gray-400 text-sm px-4 text-center';
                  fallback.innerText = 'Imagem promocional';
                  e.currentTarget.parentElement?.appendChild(fallback);
                }}
              />
            </div>
          ))}
        </div>

        {/* Indicadores (dots) */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex justify-center gap-1.5">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                index === currentSlide ? "bg-white w-4" : "bg-white/50"
              }`}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}