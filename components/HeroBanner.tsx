'use client';

import { useEffect, useState } from 'react';

const heroImages = [
  {
    category: 'Fashion & Lifestyle',
    image:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1600&q=80',
  },
  {
    category: 'Fresh Produce',
    image:
      'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1600&q=80',
  },
  {
    category: 'Electronics & Gadgets',
    image:
      'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=1600&q=80',
  },
  {
    category: 'Wellness & Pharmacy',
    image:
      'https://images.unsplash.com/photo-1584982751631-3f7c88d66a55?auto=format&fit=crop&w=1600&q=80',
  },
  {
    category: 'Food & Beverage',
    image:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80',
  },
];

type HeroBannerProps = {
  locationName?: string;
};

export default function HeroBanner({ locationName }: HeroBannerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <section className="relative w-full bg-black">
        <div className="relative w-full h-[360px] sm:h-[450px]">
          {heroImages.map((slide, index) => (
            <div
              key={slide.category}
              className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={slide.image}
                alt={slide.category}
                className="w-full h-full object-cover min-h-[360px] sm:min-h-[450px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute left-6 bottom-6 text-white">
                <p className="text-xs uppercase tracking-[0.4em] text-white/70">Category</p>
                <h2 className="text-2xl md:text-3xl font-semibold">{slide.category}</h2>
              </div>
            </div>
          ))}
          {locationName?.trim() ? (
            <p className="absolute left-6 bottom-[3.25rem] max-w-[min(100%,20rem)] text-sm font-medium text-white/85 sm:bottom-24">
              Near {locationName.trim()}
            </p>
          ) : null}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-5 flex items-center gap-2">
            {heroImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentSlide === index ? 'w-10 bg-white' : 'w-4 bg-white/40'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
