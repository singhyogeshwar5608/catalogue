'use client';

import { useCallback, useEffect, useState } from 'react';
import { getCategories, type Category } from '@/src/lib/api';
import { absolutizeStorageUrl } from '@/src/lib/api-shared';

type HeroSlide = {
  key: string;
  image: string;
  title: string;
  subtitle?: string;
};

const FALLBACK_SLIDES: HeroSlide[] = [
  {
    key: 'fallback-1',
    title: 'Fashion & Lifestyle',
    image:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1600&q=80',
  },
  {
    key: 'fallback-2',
    title: 'Fresh Produce',
    image:
      'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1600&q=80',
  },
  {
    key: 'fallback-3',
    title: 'Electronics & Gadgets',
    image:
      'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=1600&q=80',
  },
  {
    key: 'fallback-4',
    title: 'Wellness & Pharmacy',
    image:
      'https://images.unsplash.com/photo-1584982751631-3f7c88d66a55?auto=format&fit=crop&w=1600&q=80',
  },
  {
    key: 'fallback-5',
    title: 'Food & Beverage',
    image:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80',
  },
];

function collectCategoryBannerUrls(category: Category): string[] {
  const out: string[] = [];
  if (Array.isArray(category.banner_images) && category.banner_images.length > 0) {
    for (const u of category.banner_images) {
      if (typeof u === 'string' && u.trim()) {
        out.push(u.trim());
      }
    }
  }
  if (out.length === 0 && category.banner_image && String(category.banner_image).trim()) {
    out.push(String(category.banner_image).trim());
  }
  return out;
}

function slidesFromCategories(categories: Category[]): HeroSlide[] {
  const slides: HeroSlide[] = [];
  for (const c of categories) {
    const urls = collectCategoryBannerUrls(c);
    const seen = new Set<string>();
    let i = 0;
    for (const raw of urls) {
      if (seen.has(raw)) continue;
      seen.add(raw);
      const title =
        typeof c.banner_title === 'string' && c.banner_title.trim() !== ''
          ? c.banner_title.trim()
          : c.name;
      const subtitle =
        typeof c.banner_subtitle === 'string' && c.banner_subtitle.trim() !== ''
          ? c.banner_subtitle.trim()
          : undefined;
      slides.push({
        key: `cat-${c.id}-${i++}`,
        image: absolutizeStorageUrl(raw),
        title,
        subtitle,
      });
    }
  }
  return slides;
}

export default function HeroBanner() {
  const [slides, setSlides] = useState<HeroSlide[]>(FALLBACK_SLIDES);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const categories = await getCategories();
        if (cancelled) return;
        const built = slidesFromCategories(categories);
        if (built.length > 0) {
          setSlides(built);
        }
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const len = slides.length;

  useEffect(() => {
    setCurrentSlide((prev) => (len > 0 ? prev % len : 0));
  }, [len]);

  const tick = useCallback(() => {
    setCurrentSlide((prev) => (len > 0 ? (prev + 1) % len : 0));
  }, [len]);

  useEffect(() => {
    if (len <= 1) return undefined;
    const interval = setInterval(tick, 4000);
    return () => clearInterval(interval);
  }, [len, tick]);

  return (
    <>
      <section className="relative w-full bg-black">
        <div className="relative w-full h-[360px] sm:h-[450px]">
          {slides.map((slide, index) => (
            <div
              key={slide.key}
              className={`absolute inset-0 will-change-[opacity] transition-opacity duration-700 ease-out ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={slide.image}
                alt=""
                className="w-full h-full object-cover min-h-[360px] sm:min-h-[450px]"
                loading="eager"
                referrerPolicy="no-referrer"
              />
              {/* Light bottom fade to improve contrast on bright photos; no text on hero. */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
