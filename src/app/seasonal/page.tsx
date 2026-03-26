'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Anime } from '@/lib/api';

const SEASONS = ['winter', 'spring', 'summer', 'fall'];
const SEASON_NAMES = ['Winter', 'Spring', 'Summer', 'Fall'];

export default function SeasonalPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentSeasonIndex = Math.floor(currentMonth / 3);
  
  const [year, setYear] = useState(currentYear);
  const [seasonIndex, setSeasonIndex] = useState(currentSeasonIndex);
  const [anime, setAnime] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSeasonalAnime();
  }, [year, seasonIndex]);

  const loadSeasonalAnime = async () => {
    setLoading(true);
    try {
      const season = SEASONS[seasonIndex];
      const res = await fetch(`https://api.jikan.moe/v4/seasons/${year}/${season}`);
      const data = await res.json();
      setAnime(data.data || []);
    } catch (error) {
      console.error('Error loading seasonal anime:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousSeason = () => {
    if (seasonIndex === 0) {
      setSeasonIndex(3);
      setYear(year - 1);
    } else {
      setSeasonIndex(seasonIndex - 1);
    }
  };

  const goToNextSeason = () => {
    if (seasonIndex === 3) {
      setSeasonIndex(0);
      setYear(year + 1);
    } else {
      setSeasonIndex(seasonIndex + 1);
    }
  };

  const goToCurrentSeason = () => {
    setYear(currentYear);
    setSeasonIndex(currentSeasonIndex);
  };

  const isCurrentSeason = year === currentYear && seasonIndex === currentSeasonIndex;

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white pb-20">
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-bold mb-2 flex items-center gap-3">
              <Calendar className="text-neonCyan" />
              Seasonal Anime
            </h1>
            <p className="text-white/60">Discover anime by season</p>
          </div>
        </div>

        {/* Season Navigator */}
        <div className="glass rounded-2xl p-6 border border-white/10 mb-8">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousSeason}
              className="p-3 rounded-xl hover:bg-white/10 transition-all"
            >
              <ChevronLeft size={24} />
            </button>

            <div className="text-center">
              <h2 className="text-4xl font-bold mb-2">
                {SEASON_NAMES[seasonIndex]} {year}
              </h2>
              {!isCurrentSeason && (
                <button
                  onClick={goToCurrentSeason}
                  className="text-sm text-neonCyan hover:underline"
                >
                  Go to Current Season
                </button>
              )}
            </div>

            <button
              onClick={goToNextSeason}
              className="p-3 rounded-xl hover:bg-white/10 transition-all"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Season Tabs */}
          <div className="flex gap-2 mt-6">
            {SEASON_NAMES.map((name, idx) => (
              <button
                key={name}
                onClick={() => setSeasonIndex(idx)}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  seasonIndex === idx
                    ? 'bg-neonCyan text-black'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Anime Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="text-neonCyan w-12 h-12 animate-spin" />
          </div>
        ) : anime.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/40 text-lg">No anime found for this season.</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-white/60">{anime.length} anime this season</p>
            </div>

            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {anime.map((item, idx) => (
                <motion.div
                  key={item.mal_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => router.push(`/anime/${item.mal_id}`)}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-3">
                    <img
                      src={item.images.webp.large_image_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Status Badge */}
                    {(item as any).status && (
                      <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold ${
                        (item as any).status === 'Currently Airing'
                          ? 'bg-green-500/90 text-white'
                          : (item as any).status === 'Not yet aired'
                          ? 'bg-blue-500/90 text-white'
                          : 'bg-gray-500/90 text-white'
                      }`}>
                        {(item as any).status === 'Currently Airing' ? 'Airing' : 
                         (item as any).status === 'Not yet aired' ? 'Upcoming' : 'Completed'}
                      </div>
                    )}

                    {/* Score Badge */}
                    {item.score && (
                      <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/80 backdrop-blur-sm text-sm font-bold">
                        ⭐ {item.score}
                      </div>
                    )}
                  </div>

                  <h3 className="font-bold text-sm mb-1 group-hover:text-neonCyan transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <span>{(item as any).type || 'TV'}</span>
                    {(item as any).episodes && (
                      <>
                        <span>•</span>
                        <span>{(item as any).episodes} eps</span>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
