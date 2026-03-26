'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bookmark, Loader2, Play } from 'lucide-react';
import FavoriteButton from '@/components/FavoriteButton';

export default function LibraryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      signIn();
    }
  }, [status, router]);

  useEffect(() => {
    const fetchLibrary = async () => {
      if (status !== 'authenticated') return;
      try {
        const res = await fetch('/api/library');
        if (res.ok) {
          const data = await res.json();
          setItems(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLibrary();
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0B0E14]">
        <Loader2 className="text-neon-cyan w-12 h-12 animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  return (
    <div className="bg-[#0B0E14] min-h-screen text-white pt-24 px-8 pb-32">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-neon-cyan to-pulsing-violet flex items-center justify-center shadow-[0_0_30px_rgba(0,242,255,0.2)]">
            <Bookmark size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-outfit font-black tracking-tight drop-shadow-lg">My Library</h1>
            <p className="text-white/50 text-sm font-medium mt-1">
              {items.length} {items.length === 1 ? 'title' : 'titles'} perfectly curated for you, {session?.user?.name || 'Explorer'}
            </p>
          </div>
        </div>

        {/* Grid */}
        {items.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {items.map((item, idx) => {
              // Reconstruct the minimal Anime signature so FavoriteButton works
              const fakeAnimeToken = {
                mal_id: item.animeId,
                title: item.title,
                images: { webp: { large_image_url: item.image, small_image_url: item.image } }
              } as any;

              return (
                <motion.div 
                  key={idx}
                  whileHover={{ y: -8 }}
                  onClick={() => router.push(`/anime/${item.animeId}`)}
                  className="group relative h-72 rounded-2xl overflow-hidden glass border border-white/5 cursor-pointer shadow-xl"
                >
                  <div className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-500" style={{ backgroundImage: `url(${item.image})` }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] via-transparent to-[#0B0E14]/70 group-hover:opacity-60 transition-opacity" />
                  
                  <div className="absolute top-2 right-2 z-20">
                    <FavoriteButton anime={fakeAnimeToken} compact />
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="w-12 h-12 rounded-full glass flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.5)]">
                      <Play className="text-neon-cyan fill-neon-cyan ml-1" size={20} />
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14]/80 to-transparent">
                    <h3 className="text-sm font-bold group-hover:text-neon-cyan transition-colors truncate pt-4 drop-shadow-md">{item.title}</h3>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center glass rounded-3xl border border-white/5 mx-auto max-w-2xl px-8 shadow-2xl">
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
              <Bookmark size={40} className="text-white/20" />
            </div>
            <h2 className="text-2xl font-bold font-outfit mb-3">Your Library is Empty</h2>
            <p className="text-white/50 max-w-md mx-auto mb-8">
              Explore the multiverse and save your favorite series and movies directly into your personal collection.
            </p>
            <button 
              onClick={() => router.push('/browse')}
              className="bg-white text-black px-8 py-4 rounded-xl font-bold hover:bg-neon-cyan outline-none transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(0,242,255,0.3)]"
            >
              Discover Anime
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
