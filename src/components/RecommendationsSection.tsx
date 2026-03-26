'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Users } from 'lucide-react';
import { getAnimeById, Anime } from '@/lib/api';

interface Recommendation {
  animeId: number;
  score: number;
  reason: string;
}

export default function RecommendationsSection() {
  const { data: session } = useSession();
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [animeData, setAnimeData] = useState<{ [key: number]: Anime }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      loadRecommendations();
    }
  }, [session]);

  const loadRecommendations = async () => {
    try {
      const res = await fetch('/api/recommendations');
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);

        // Fetch anime details for each recommendation
        const animePromises = (data.recommendations || []).slice(0, 6).map(async (rec: Recommendation) => {
          try {
            const anime = await getAnimeById(rec.animeId);
            return { id: rec.animeId, data: anime };
          } catch {
            return null;
          }
        });

        const results = await Promise.all(animePromises);
        const animeMap: { [key: number]: Anime } = {};
        results.forEach(result => {
          if (result) {
            animeMap[result.id] = result.data;
          }
        });
        setAnimeData(animeMap);
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!session || loading) return null;

  if (recommendations.length === 0) return null;

  return (
    <section className="mb-20">
      <div className="flex items-center gap-3 mb-8">
        <Sparkles className="text-neonCyan" size={28} />
        <h2 className="text-3xl font-outfit font-black">Recommended For You</h2>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.slice(0, 6).map((rec, idx) => {
          const anime = animeData[rec.animeId];
          if (!anime) return null;

          return (
            <motion.div
              key={rec.animeId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => router.push(`/anime/${rec.animeId}`)}
              className="group cursor-pointer"
            >
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-4">
                <img
                  src={anime.images.webp.large_image_url}
                  alt={anime.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* Recommendation Badge */}
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-neonCyan/90 backdrop-blur-sm text-black text-xs font-bold flex items-center gap-1">
                  <Sparkles size={12} />
                  {Math.round(rec.score * 100)}% Match
                </div>

                {/* Reason */}
                <div className="absolute bottom-3 left-3 right-3 px-3 py-2 rounded-xl glass backdrop-blur-md text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  {rec.reason}
                </div>
              </div>

              <h3 className="font-bold text-lg mb-1 group-hover:text-neonCyan transition-colors line-clamp-1">
                {anime.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <span className="flex items-center gap-1">
                  ⭐ {anime.score}
                </span>
                <span>•</span>
                <span>{(anime as any).type || 'TV'}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
