'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Info, ChevronRight, Loader2 } from 'lucide-react';
import { getTrendingAnime, getPopularAllTime, getAnimeSeries, getNewReleases, getAnimeMovies, Anime } from '@/lib/api';
import NebulaPlayer from '@/components/NebulaPlayer';

export default function Home() {
  const router = useRouter();
  const [trending, setTrending] = useState<Anime[]>([]);
  const [animeSeries, setAnimeSeries] = useState<Anime[]>([]);
  const [popularAllTime, setPopularAllTime] = useState<Anime[]>([]);
  const [newReleases, setNewReleases] = useState<Anime[]>([]);
  const [animeMovies, setAnimeMovies] = useState<Anime[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  
  // Data Fetching
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [trendingData, seriesData, popularData, newReleasesData, moviesData] = await Promise.all([
        getTrendingAnime(),
        getAnimeSeries(),
        getPopularAllTime(),
        getNewReleases(),
        getAnimeMovies()
      ]);
      setTrending(trendingData);
      setAnimeSeries(seriesData);
      setPopularAllTime(popularData);
      setNewReleases(newReleasesData);
      setAnimeMovies(moviesData);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Hero Section Cycling
  useEffect(() => {
    if (trending.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % trending.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [trending]);

  // Player Delay
  useEffect(() => {
    setShowPlayer(false);
    const timer = setTimeout(() => setShowPlayer(true), 1500);
    return () => clearTimeout(timer);
  }, [currentIdx]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="text-neonCyan w-12 h-12" />
        </motion.div>
      </div>
    );
  }

  const currentAnime = trending[currentIdx];

  return (
    <>
      {/* Hero Section */}
      {currentAnime && (
        <section className="relative h-[85vh] w-full overflow-hidden flex items-center">
          <AnimatePresence>
            <motion.div
              key={`hero-bg-${currentAnime.mal_id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0"
            >
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] scale-100"
                style={{ backgroundImage: `url(${currentAnime.images.webp.large_image_url})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0B0E14] via-[#0B0E14]/70 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] via-transparent to-black/20" />
            </motion.div>
          </AnimatePresence>

          <div className="relative z-10 w-full grid lg:grid-cols-2 gap-12 px-12 items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={`content-${currentAnime.mal_id}`}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <span className="px-3 py-1 rounded bg-neonCyan/20 text-neonCyan text-[10px] uppercase font-bold tracking-widest border border-neonCyan/30">Trending Now</span>
                  <span className="text-white/60 text-sm font-medium">{currentAnime.score} Score</span>
                </div>
                
                <h1 className="text-6xl font-outfit font-black mb-6 leading-tight tracking-tight drop-shadow-2xl">
                  {currentAnime.title}
                </h1>
                
                <p className="text-lg text-white/60 mb-10 leading-relaxed line-clamp-3">
                  {currentAnime.synopsis}
                </p>

                <div className="flex items-center gap-4">
                  <button 
                  onClick={() => router.push(`/anime/${currentAnime.mal_id}`)}
                  className="flex items-center gap-2 px-8 py-4 bg-white text-black rounded-xl font-bold hover:bg-neonCyan hover:text-black transition-all group shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                  <Play size={20} className="fill-current" />
                  Watch Now
                </button>
                  <button onClick={() => router.push(`/anime/${currentAnime.mal_id}`)} className="flex items-center gap-2 px-8 py-4 glass text-white rounded-xl font-bold hover:bg-white/10 transition-all border border-white/5">
                    <Info size={20} />
                    More Details
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="relative hidden lg:block">
              <AnimatePresence mode="wait">
                {showPlayer && (
                  <motion.div
                    key={`player-${currentAnime.mal_id}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.5 }}
                  >
                    <NebulaPlayer 
                       url={currentAnime.trailer?.embed_url || currentAnime.trailer?.url || "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"} 
                       poster={currentAnime.images.webp.large_image_url} 
                       title={currentAnime.title}
                       type={(currentAnime.trailer?.embed_url || currentAnime.trailer?.url) ? 'youtube' : 'hls'}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="absolute bottom-12 right-12 flex gap-3">
            {trending.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIdx(idx)}
                className={`h-1.5 transition-all duration-300 rounded-full ${idx === currentIdx ? 'w-12 bg-neonCyan shadow-[0_0_10px_rgba(0,242,255,0.5)]' : 'w-6 bg-white/20 hover:bg-white/40'}`}
              />
            ))}
          </div>
        </section>
      )}

      <section className="px-12 py-12 space-y-24 pb-32">
         <CategoryRow title="New Releases" category="new_releases" items={newReleases} />
         <CategoryRow title="Anime Series" category="anime_series" items={animeSeries} />
         <CategoryRow title="Popular All Time" category="popular_all_time" items={popularAllTime} />
         <CategoryRow title="Anime Movies" category="anime_movies" items={animeMovies} />
      </section>
    </>
  );
}

function CategoryRow({ title, category, items }: { title: string, category: string, items: any[] }) {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-outfit font-bold tracking-tight text-white">{title}</h2>
        <button 
          onClick={() => router.push(`/explore/${category}`)}
          className="text-sm font-medium text-neonCyan hover:underline flex items-center gap-1 group"
        >
          Explore All <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {items.map((item, idx) => (
          <motion.div 
            key={idx}
            whileHover={{ y: -8 }}
            onClick={() => router.push(`/anime/${item.mal_id}`)}
            className="group relative h-64 rounded-2xl overflow-hidden glass border border-white/5 cursor-pointer shadow-lg"
          >
            <div className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-500" style={{ backgroundImage: `url(${item.images?.webp?.large_image_url})` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] via-transparent to-black/30 group-hover:opacity-60 transition-opacity" />
            

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0B0E14] to-transparent">
              <h3 className="text-sm font-bold group-hover:text-neonCyan transition-colors truncate drop-shadow-md">{item.title}</h3>
              <p className="text-[10px] text-white/60 truncate mt-1">{item.genres?.map((g: any) => g.name).join(', ')}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
