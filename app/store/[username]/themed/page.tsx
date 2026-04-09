import { getStoreBySlug, getProductsByStore } from '@/src/lib/api';
import { getThemeById } from '@/data/themes';
import BasicTheme from '@/components/themes/BasicTheme';
import PremiumTheme from '@/components/themes/PremiumTheme';
import { notFound } from 'next/navigation';

export default async function ThemedStorePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  
  try {
    const store = await getStoreBySlug(username);
    
    if (!store) {
      notFound();
    }

    const storeProducts = await getProductsByStore(store.id);
    
    const themeId = store.themeId || 'audio-basic';
    const theme = getThemeById(themeId);

    if (!theme) {
      notFound();
    }

    const ThemeComponent = theme.plan === 'premium' ? PremiumTheme : BasicTheme;

    return (
      <ThemeComponent
        theme={theme}
        products={storeProducts}
        storeName={store.name}
        storeLogo={store.logo}
        storeBanner={store.banner}
        storeDescription={store.description}
        storeRating={store.rating}
        storeLocation={store.location}
        storePhone={store.whatsapp}
      />
    );
  } catch (error) {
    console.error('Failed to load themed store:', error);
    notFound();
  }
}
