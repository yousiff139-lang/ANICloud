'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { getTrendingAnime, getPopularAllTime, getAnimeSeries, getNewReleases, getAnimeMovies, getLastSeasonAnime, Anime } from '@/lib/api';

export default function ExplorePage() {
  const { category } = useParams() as any;
  const router = useRouter();
  const [items, setItems] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchCategory = async (targetPage: number, append: boolean = false) => {
    if (targetPage === 1) setLoading(true);
    else setLoadingMore(true);
    
    try {
      let data: Anime[] = [];
      
      console.log(`📡 Explore: Fetching live data for category: ${category}, Page: ${targetPage}`);
      switch (category) {
        case 'new_releases':
          if (targetPage === 1) {
            const [currentSeason, lastSeason] = await Promise.all([
              getNewReleases(1),
              getLastSeasonAnime(1)
            ]);
            data = [...currentSeason, ...lastSeason];
          } else {
            data = await getNewReleases(targetPage);
          }
          break;
        case 'trending':
        case 'popular_all_time':
          data = await getPopularAllTime(targetPage);
          break;
        case 'anime_series':
          data = await getAnimeSeries(targetPage);
          break;
        case 'anime_movies':
          data = await getAnimeMovies(targetPage);
          break;
        default:
          const res = await axios.get('/api/anime');
          data = res.data[category as string] || [];
      }

      if (data.length === 0 && targetPage === 1) {
        const res = await axios.get('/api/anime');
        data = res.data[category as string] || [];
        setHasMore(false);
      } else if (data.length < 20) {
        setHasMore(false);
      }

      if (append) {
        setItems(prev => {
          const combined = [...prev, ...data];
          const unique = Array.from(new Map(combined.map(item => [item.mal_id, item])).values());
          return unique;
        });
      } else {
        setItems(data);
      }
    } catch (e) {
      setHasMore(false);
    }
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchCategory(1, false);
  }, [category]);

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCategory(nextPage, true);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, category]);

  const titles: Record<string, string> = {
    new_releases: "New Releases",
    anime_series: "Anime Series",
    popular_all_time: "Popular All Time",
    anime_movies: "Anime Movies"
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0B0E14]">
        <Loader2 className="text-neonCyan w-12 h-12 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex items-center justify-between">
           <button 
             onClick={() => router.back()}
             className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
           >
             <ArrowLeft size={20} /> Back
           </button>
           <h1 className="text-4xl font-outfit font-black tracking-tight">{titles[category as string] || "Explore"}</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
          {items.map((item, idx) => (
            <motion.div 
              key={`${item.mal_id}-${idx}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (idx % 10) * 0.05 }}
              whileHover={{ y: -10 }}
              onClick={() => router.push(`/anime/${item.mal_id}`)}
              className="group relative h-80 rounded-2xl overflow-hidden glass border border-white/5 cursor-pointer shadow-lg"
            >
              <div className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-500" style={{ backgroundImage: `url(${item.images?.webp?.large_image_url})` }} />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] via-transparent to-transparent group-hover:opacity-40 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0B0E14] to-transparent">
                <h3 className="text-sm font-bold group-hover:text-neonCyan transition-colors line-clamp-2 drop-shadow-md">{item.title}</h3>
                <span className="text-[10px] text-white/40">{item.score} Score</span>
              </div>
            </motion.div>
          ))}
          
          {(hasMore || loadingMore) && (
            <div ref={observerTarget} className="w-full py-20 flex flex-col items-center justify-center col-span-full">
              <Loader2 className="animate-spin text-neonCyan w-10 h-10 mb-4" />
              <span className="text-white/40 text-xs font-bold uppercase tracking-widest animate-pulse">Fetching and processing more titles...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
