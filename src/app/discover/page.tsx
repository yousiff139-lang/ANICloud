'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Filter, Calendar, TrendingUp, Shuffle, Loader2, X } from 'lucide-react';
import { Anime } from '@/lib/api';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
  'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural'
];

const YEARS = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);

const SEASONS = ['Winter', 'Spring', 'Summer', 'Fall'];

const TYPES = ['TV', 'Movie', 'OVA', 'ONA', 'Special'];

const STATUSES = ['Airing', 'Completed', 'Upcoming'];

export default function DiscoverPage() {
  const router = useRouter();
  
  const [anime, setAnime] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [minScore, setMinScore] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'score' | 'popularity' | 'recent'>('popularity');

  useEffect(() => {
    loadAnime();
  }, [selectedGenres, selectedYear, selectedSeason, selectedType, selectedStatus, minScore, sortBy]);

  const loadAnime = async () => {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (selectedGenres.length > 0) params.append('genres', selectedGenres.join(','));
      if (selectedYear) params.append('year', selectedYear.toString());
      if (selectedSeason) params.append('season', selectedSeason.toLowerCase());
      if (selectedType) params.append('type', selectedType);
      if (selectedStatus) params.append('status', selectedStatus);
      if (minScore > 0) params.append('min_score', minScore.toString());
      params.append('order_by', sortBy);
      params.append('sort', 'desc');

      // Fetch from Jikan API
      const res = await fetch(`https://api.jikan.moe/v4/anime?${params.toString()}&limit=24`);
      const data = await res.json();
      setAnime(data.data || []);
    } catch (error) {
      console.error('Error loading anime:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const clearFilters = () => {
    setSelectedGenres([]);
    setSelectedYear(null);
    setSelectedSeason(null);
    setSelectedType(null);
    setSelectedStatus(null);
    setMinScore(0);
  };

  const getRandomAnime = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://api.jikan.moe/v4/random/anime');
      const data = await res.json();
      if (data.data) {
        router.push(`/anime/${data.data.mal_id}`);
      }
    } catch (error) {
      console.error('Error getting random anime:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white pb-20">
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-bold mb-2">Discover Anime</h1>
            <p className="text-white/60">Find your next favorite anime</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={getRandomAnime}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pulsingViolet to-neonCyan text-white rounded-xl font-bold hover:scale-105 transition-all disabled:opacity-50"
            >
              <Shuffle size={20} />
              Random Anime
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                showFilters ? 'bg-neonCyan text-black' : 'glass hover:bg-white/10'
              }`}
            >
              <Filter size={20} />
              Filters
              {(selectedGenres.length > 0 || selectedYear || selectedSeason || selectedType || selectedStatus || minScore > 0) && (
                <span className="w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 border border-white/10 mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Filters</h3>
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 text-sm text-white/60 hover:text-neonCyan transition-colors"
              >
                <X size={16} />
                Clear All
              </button>
            </div>

            <div className="space-y-6">
              {/* Genres */}
              <div>
                <label className="block text-sm font-bold mb-3">Genres</label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        selectedGenres.includes(genre)
                          ? 'bg-neonCyan text-black'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year & Season */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-3">Year</label>
                  <select
                    value={selectedYear || ''}
                    onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neonCyan"
                  >
                    <option value="">All Years</option>
                    {YEARS.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-3">Season</label>
                  <select
                    value={selectedSeason || ''}
                    onChange={(e) => setSelectedSeason(e.target.value || null)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neonCyan"
                  >
                    <option value="">All Seasons</option>
                    {SEASONS.map((season) => (
                      <option key={season} value={season}>{season}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Type & Status */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-3">Type</label>
                  <select
                    value={selectedType || ''}
                    onChange={(e) => setSelectedType(e.target.value || null)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neonCyan"
                  >
                    <option value="">All Types</option>
                    {TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-3">Status</label>
                  <select
                    value={selectedStatus || ''}
                    onChange={(e) => setSelectedStatus(e.target.value || null)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neonCyan"
                  >
                    <option value="">All Status</option>
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Min Score */}
              <div>
                <label className="block text-sm font-bold mb-3">
                  Minimum Score: {minScore > 0 ? minScore : 'Any'}
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-neonCyan"
                  style={{
                    background: `linear-gradient(to right, #B026FF 0%, #B026FF ${minScore * 10}%, rgba(255,255,255,0.1) ${minScore * 10}%, rgba(255,255,255,0.1) 100%)`
                  }}
                />
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-bold mb-3">Sort By</label>
                <div className="flex gap-2">
                  {[
                    { value: 'popularity', label: 'Popularity', icon: <TrendingUp size={16} /> },
                    { value: 'score', label: 'Score', icon: '⭐' },
                    { value: 'recent', label: 'Recent', icon: <Calendar size={16} /> }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value as any)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
                        sortBy === option.value
                          ? 'bg-neonCyan text-black'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {option.icon}
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="text-neonCyan w-12 h-12 animate-spin" />
          </div>
        ) : anime.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/40 text-lg">No anime found. Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-white/60">{anime.length} results</p>
            </div>

            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {anime.map((item, idx) => (
                <motion.div
                  key={item.mal_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
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
                    
                    {/* Score Badge */}
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/80 backdrop-blur-sm text-sm font-bold flex items-center gap-1">
                      ⭐ {item.score || 'N/A'}
                    </div>
                  </div>

                  <h3 className="font-bold text-sm mb-1 group-hover:text-neonCyan transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <span>{(item as any).type || 'TV'}</span>
                    {(item as any).year && (
                      <>
                        <span>•</span>
                        <span>{(item as any).year}</span>
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
