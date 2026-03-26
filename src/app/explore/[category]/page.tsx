'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, ChevronRight } from 'lucide-react';
import axios from 'axios';

export default function ExplorePage() {
  const { category } = useParams();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategory = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/anime');
        setItems(res.data[category as string] || []);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchCategory();
  }, [category]);

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
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -10 }}
              onClick={() => router.push(`/anime/${item.mal_id}`)}
              className="group relative h-80 rounded-2xl overflow-hidden glass border border-white/5 cursor-pointer"
            >
              <div className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-500" style={{ backgroundImage: `url(${item.images?.webp?.large_image_url})` }} />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] via-transparent to-transparent group-hover:opacity-0 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0B0E14] to-transparent">
                <h3 className="text-sm font-bold group-hover:text-neonCyan transition-colors line-clamp-2">{item.title}</h3>
                <span className="text-[10px] text-white/40">{item.score} Score</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
