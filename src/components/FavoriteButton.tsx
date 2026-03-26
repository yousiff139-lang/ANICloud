'use client';

import { useState, useEffect } from 'react';
import { Heart, Bookmark, Loader2 } from 'lucide-react';
import { useSession, signIn } from 'next-auth/react';
import { Anime } from '@/lib/api';

export default function FavoriteButton({ anime, compact = false, type = 'favorite' }: { anime: Anime | null, compact?: boolean, type?: 'favorite' | 'library' }) {
  const { data: session } = useSession();
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  const isFavorite = type === 'favorite';
  const themeColor = isFavorite ? 'pulsing-violet' : 'neon-cyan';
  const Icon = isFavorite ? Heart : Bookmark;

  useEffect(() => {
    if (!session || !anime) {
      setInitialCheckDone(true);
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/library?favorites=${isFavorite}`);
        if (res.ok) {
          const library = await res.json();
          setIsActive(library.some((item: any) => item.animeId === anime.mal_id));
        }
      } catch (e) {
        console.error('Failed to fetch status', e);
      } finally {
        setInitialCheckDone(true);
      }
    };
    checkStatus();
  }, [session, anime, type]);

  const toggleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!session) {
      signIn(); // This triggers the standard NextAuth sign-in flow with the current URL as callback
      return;
    }

    if (!anime || loading) return;

    setLoading(true);

    try {
      if (isActive) {
        await fetch(`/api/library?animeId=${anime.mal_id}&type=${type}`, { method: 'DELETE' });
        setIsActive(false);
      } else {
        await fetch('/api/library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            animeId: anime.mal_id,
            title: anime.title,
            image: anime.images?.webp?.large_image_url || anime.images?.webp?.small_image_url,
            type: type
          })
        });
        setIsActive(true);
      }
    } catch (e) {
      console.error('Failed to toggle status', e);
    } finally {
      setLoading(false);
    }
  };

  if (!initialCheckDone) {
    return (
      <button className={`flex items-center justify-center gap-2 glass rounded-xl text-white/50 transition-all ${compact ? 'p-2' : 'w-full py-4 mt-3'}`}>
        <Loader2 size={compact ? 18 : 20} className="animate-spin" />
      </button>
    );
  }

  return (
    <button 
      onClick={toggleStatus}
      className={`relative overflow-hidden group flex items-center justify-center gap-2 rounded-xl font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
        compact ? 'p-2 glass hover:bg-white/10' : 'w-full py-4 mt-3 glass border border-white/5 shadow-xl'
      } ${isActive ? `bg-${themeColor}/20 border-${themeColor}/50` : 'hover:bg-white/5 hover:border-white/20'}`}
    >
      <Icon 
        size={compact ? 18 : 20} 
        className={`transition-all duration-300 ${isActive ? `fill-${themeColor} text-${themeColor}` : `text-white/70 group-hover:text-${themeColor} group-hover:fill-${themeColor}/20`}`} 
      />
      {!compact && (
        <span className={`${isActive ? `text-${themeColor}` : 'text-white/70 group-hover:text-themeColor'} transition-colors duration-300`}>
          {isActive ? (isFavorite ? 'Favorited' : 'In Library') : (isFavorite ? 'Favorite' : 'Add to Library')}
        </span>
      )}
    </button>
  );
}
