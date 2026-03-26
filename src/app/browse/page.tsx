'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Filter, Loader2, Play } from 'lucide-react';
import { searchAnime, Anime } from '@/lib/api';
import { motion } from 'framer-motion';

export default function BrowsePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [rating, setRating] = useState('');
  const [type, setType] = useState('');
  const [year, setYear] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      setPage(1);
      const data = await searchAnime({
        q: query,
        genres: genre,
        rating: rating,
        type: type,
        start_date: year ? `${year}-01-01` : undefined,
        end_date: year ? `${year}-12-31` : undefined,
        page: 1
      });
      setResults(data.data || []);
      setHasMore(data.pagination?.has_next_page ?? false);
      setLoading(false);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, genre, rating, type, year]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const data = await searchAnime({
      q: query,
      genres: genre,
      rating: rating,
      type: type,
      start_date: year ? `${year}-01-01` : undefined,
      end_date: year ? `${year}-12-31` : undefined,
      page: nextPage
    });
    setResults(prev => [...prev, ...(data.data || [])]);
    setHasMore(data.pagination?.has_next_page ?? false);
    setPage(nextPage);
    setLoadingMore(false);
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
  }, [hasMore, loading, loadingMore, page, query, genre, rating, type, year]);

  const genres = [
    { id: '1', name: 'Action' }, { id: '2', name: 'Adventure' }, { id: '4', name: 'Comedy' },
    { id: '8', name: 'Drama' }, { id: '10', name: 'Fantasy' }, { id: '14', name: 'Horror' },
    { id: '22', name: 'Romance' }, { id: '24', name: 'Sci-Fi' }, { id: '36', name: 'Slice of Life' }
  ];

  const ratings = [
    { id: 'g', name: 'G - All Ages' }, { id: 'pg', name: 'PG - Children' },
    { id: 'pg13', name: 'PG-13 - Teens 13+' }, { id: 'r17', name: 'R - 17+ (Violence/Profanity)' },
    { id: 'r', name: 'R+ - Mild Nudity' }
  ];

  const types = [
    { id: 'tv', name: 'TV Series' }, { id: 'movie', name: 'Movie' },
    { id: 'ova', name: 'OVA' }, { id: 'special', name: 'Special' }
  ];

  const years = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="p-12 text-white">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col gap-6">
          <h1 className="text-5xl font-outfit font-black tracking-tight">Global Browse</h1>
          <p className="text-white/60 max-w-2xl">Discover thousands of anime titles, filtered by your preferences and real-time popularity.</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-neonCyan transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Search for your next favorite anime..." 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-lg focus:outline-none focus:border-neonCyan/50 transition-all font-medium"
              />
            </div>
            <button 
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className={`px-6 py-4 rounded-2xl flex items-center gap-2 transition-all font-bold ${isFiltersOpen ? 'bg-neonCyan text-black border border-neonCyan' : 'glass hover:bg-white/10 border border-white/10'}`}
            >
              <Filter size={20} />
              Filters
            </button>
          </div>

          {isFiltersOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="glass p-6 rounded-2xl border border-white/10 flex flex-wrap gap-4"
            >
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-white/50 font-bold tracking-widest uppercase mb-2 block">Genre</label>
                <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full bg-[#0B0E14] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-neonCyan appearance-none cursor-pointer">
                  <option value="">All Genres</option>
                  {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-white/50 font-bold tracking-widest uppercase mb-2 block">Age Rating</label>
                <select value={rating} onChange={(e) => setRating(e.target.value)} className="w-full bg-[#0B0E14] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-neonCyan appearance-none cursor-pointer">
                  <option value="">All Ratings</option>
                  {ratings.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-white/50 font-bold tracking-widest uppercase mb-2 block">Format</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-[#0B0E14] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-neonCyan appearance-none cursor-pointer">
                  <option value="">All Formats</option>
                  {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-white/50 font-bold tracking-widest uppercase mb-2 block">Release Year</label>
                <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full bg-[#0B0E14] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-neonCyan appearance-none cursor-pointer">
                  <option value="">Any Time</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button 
                  onClick={() => { setGenre(''); setRating(''); setYear(''); setType(''); }}
                  className="px-6 py-3 text-sm bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-white/70 rounded-xl font-bold transition-all border border-white/5 hover:border-red-500/30"
                >
                  Clear Filters
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-neonCyan w-10 h-10" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {results.map((anime) => (
              <motion.div 
                key={anime.mal_id}
                onClick={() => router.push(`/anime/${anime.mal_id}`)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -10 }}
                className="group relative h-72 rounded-2xl overflow-hidden glass border border-white/5 cursor-pointer shadow-lg"
              >
                <div className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-500" style={{ backgroundImage: `url(${anime.images?.webp?.large_image_url})` }} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] via-transparent to-black/30 group-hover:opacity-60 transition-opacity" />
                

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                   <div className="w-12 h-12 rounded-full glass flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.5)]">
                     <Play className="text-neonCyan fill-neonCyan ml-1" size={20} />
                   </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0B0E14] to-transparent">
                  <h3 className="text-sm font-bold group-hover:text-neonCyan transition-colors truncate drop-shadow-md">{anime.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] bg-neonCyan/20 text-neonCyan px-2 py-0.5 rounded font-bold">{anime.score || 'N/A'}</span>
                    <p className="text-[10px] text-white/60 truncate">{anime.genres?.map(g => g.name).join(', ')}</p>
                  </div>
                </div>
              </motion.div>
            ))}
            {query && results.length === 0 && !loading && (
              <div className="col-span-full py-20 text-center">
                <p className="text-white/40 text-lg">No results found for "{query}"</p>
              </div>
            )}
            
            {/* Infinite Scroll Loader Target */}
            {(hasMore || loadingMore) && (
              <div ref={observerTarget} className="w-full py-16 flex items-center justify-center col-span-full">
                 <Loader2 className="w-10 h-10 text-neonCyan animate-spin" />
                 <span className="ml-4 text-white/50 font-bold uppercase tracking-widest text-sm animate-pulse">Scanning Database...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
