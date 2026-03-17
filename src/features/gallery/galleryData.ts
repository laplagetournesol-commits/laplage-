import { useState, useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase';

export interface GalleryItem {
  id: string;
  image_url: string;
  label: string;
  category: 'plage' | 'restaurant' | 'details';
  type: 'photo' | 'video';
  sort_order: number;
}

export function useGalleryPhotos() {
  const [photos, setPhotos] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('gallery_photos')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      setPhotos((data ?? []) as GalleryItem[]);
      setLoading(false);
    })();
  }, []);

  return { photos, loading };
}

// Pour le carousel — les 5 premières photos
export function useGalleryCarousel() {
  const { photos, loading } = useGalleryPhotos();
  return { photos: photos.slice(0, 5), loading };
}
