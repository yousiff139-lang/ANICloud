'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, Play, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface RecentItem {
  malId: number;
  title: string;
  image: string;
  episode: number;
  displayEpisode?: number;
  timestamp: number;
  duration: number;
  lastWatchedAt: number;
}

export default function RecentPage() {
  const [history, setHistory] = useState<RecentItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = JSON.parse(localStorage.getItem('anicloud_recent') || '[]');
      setHistory(saved);
    } catch (e) {
      console.error("Failed to parse history", e);
    }
  }, []);

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear your entire watch history?")) {
      localStorage.removeItem('anicloud_recent');
      setHistory([]);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#05070A] pt-8 px-6 pb-24 overflow-x-hidden">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex items-end justify-between mb-12 relative z-20">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <History className="text-neonCyan w-8 h-8" />
            <h1 className="text-4xl font-outfit font-black tracking-tight text-white drop-shadow-md">Continue Watching</h1>
          </div>
          <p className="text-white/40 font-bold tracking-widest text-xs uppercase pl-11">
            Pick up exactly where you left off
          </p>
        </div>

        {history.length > 0 && (
          <button 
            onClick={clearHistory}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors font-bold text-xs uppercase tracking-widest"
          >
            <Trash2 size={16} />
            <span>Clear History</span>
          </button>
        )}
      </div>

      <div className="max-w-7xl mx-auto relative z-20">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-24 glass rounded-3xl border border-white/5 text-center mt-12 bg-[#0B0E14]/80">
            <History className="w-16 h-16 text-white/10 mb-6" />
            <h2 className="text-2xl font-black text-white mb-2 font-outfit">No Watch History</h2>
            <p className="text-sm font-bold text-white/40 max-w-sm">You haven't watched any episodes yet. Start streaming an anime to track your progress automatically!</p>
            <Link 
              href="/browse"
              className="mt-8 px-8 py-3 bg-white text-black font-black uppercase text-xs tracking-widest rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]"
            >
              Discover Shows
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {history.map((item, idx) => {
              const progressPct = Math.min(100, (item.timestamp / item.duration) * 100) || 0;
              
              return (
                <motion.div
                  key={`${item.malId}-${item.episode}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link href={`/watch/${item.malId}/${item.episode}`} className="block group">
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden glass border border-white/10 shadow-xl bg-black">
                      <img 
                        src={item.image} 
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out opacity-80 group-hover:opacity-100"
                        loading="lazy"
                      />
                      
                      {/* Play Hover Overlay */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20 pointer-events-none">
                        <div className="w-14 h-14 rounded-full glass border border-white/20 flex items-center justify-center translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-2xl">
                          <Play className="text-white ml-1 w-6 h-6" fill="currentColor" />
                        </div>
                      </div>

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 z-30 flex flex-col gap-2">
                        <div className="px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-white/10 shadow-lg">
                          <span className="text-[10px] font-black uppercase tracking-widest text-neonCyan">EP {item.displayEpisode || item.episode}</span>
                        </div>
                      </div>

                      {/* Bottom Gradient for Text Visibility */}
                      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />

                      {/* Progress Tracker */}
                      <div className="absolute bottom-0 left-0 w-full h-1.5 bg-black/60 z-30 overflow-hidden backdrop-blur-md">
                        <div 
                          className="h-full bg-neonCyan shadow-[0_0_10px_#00F2FF] relative"
                          style={{ width: `${progressPct}%` }}
                        >
                          <div className="absolute right-0 top-0 bottom-0 w-2 bg-white blur-[1px]" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 px-1">
                      <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-neonCyan transition-colors font-outfit">{item.title}</h3>
                      <div className="flex items-center justify-between mt-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                         <span className="text-[10px] font-black tracking-widest uppercase text-white/70">{formatTime(item.timestamp)} / {formatTime(item.duration)}</span>
                         <span className="text-[10px] font-black tracking-widest text-neonCyan">{Math.round(progressPct)}%</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Decorative Lights */}
      <div className="fixed top-0 left-1/4 w-[800px] h-[600px] bg-neonCyan/5 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none z-0 mix-blend-screen" />
    </div>
  );
}
