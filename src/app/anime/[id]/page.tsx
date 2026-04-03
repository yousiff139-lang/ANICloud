'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Play, Info, ArrowLeft, Star, Clock, Calendar, List, Film, ChevronRight, Loader2 } from 'lucide-react';
import { getAnimeById, getEpisodes, getStreamUrl, Anime } from '@/lib/api';
import NebulaPlayer from '@/components/NebulaPlayer';
import FavoriteButton from '@/components/FavoriteButton';
import ReviewSection from '@/components/ReviewSection';
import WatchPartyButton from '@/components/WatchPartyButton';
import { AnimeJsonLd, BreadcrumbJsonLd } from '@/components/JsonLd';

export default function AnimeDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination State for Hooks Order Rule
  const [epChunkPage, setEpChunkPage] = useState(0);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      setLoading(true);
      const [animeData, epData] = await Promise.all([
        getAnimeById(Number(id)),
        getEpisodes(Number(id))
      ]);
      setAnime(animeData);

      // Fetch stream for episode 1 just to passively grab the FULL, unpaginated complete episode array from AnimePahe
      const stream = await getStreamUrl(Number(id), 1, animeData?.title, animeData?.title_english);
      if (stream && stream.episodes && stream.episodes.length > 0) {
        setEpisodes(stream.episodes);
      } else {
        setEpisodes(epData);
      }

      setLoading(false);

      // 3. Trigger Trailer Sync if missing or not optimized
      if (!animeData?.trailer?.embed_url?.includes('youtube-nocookie.com')) {
        console.log(`[AnimeDetail] Missing optimized trailer. Triggering sync for ID: ${id}`);
        fetch(`/api/sync/trailer?id=${id}`)
          .then(res => res.json())
          .then(syncData => {
            if (syncData.success) {
              // Re-fetch only once after sync to update the UI with the real trailer
              getAnimeById(Number(id)).then(updated => {
                if (updated) setAnime(updated);
              });
            }
          })
          .catch(err => console.error('Trailer sync failed:', err));
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0B0E14]">
        <Loader2 className="text-neonCyan w-12 h-12 animate-spin" />
      </div>
    );
  }

  if (!anime) return <div>Anime not found</div>;

  // Pagination for long-running series
  const chunkSize = 100;
  const chunkCount = Math.ceil(episodes.length / chunkSize);
  const currentChunk = episodes.slice(epChunkPage * chunkSize, (epChunkPage + 1) * chunkSize);

  return (
    <div className="bg-[#0B0E14] text-white">
      {/* Structured Data for Google Rich Results */}
      <AnimeJsonLd
        name={anime.title}
        description={anime.synopsis || `Watch ${anime.title} online for free in HD on ANICloud.`}
        image={anime.images.webp.large_image_url}
        url={`${typeof window !== 'undefined' ? window.location.origin : 'https://anicloud-production.up.railway.app'}/anime/${id}`}
        rating={anime.score || 0}
        genres={anime.genres?.map((g: any) => g.name) || []}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://anicloud-production.up.railway.app' },
          { name: 'Browse', url: 'https://anicloud-production.up.railway.app/browse' },
          { name: anime.title, url: `https://anicloud-production.up.railway.app/anime/${id}` },
        ]}
      />
      {/* Hero Backdrop */}
      <div className="relative h-[60vh] w-full">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${anime.images.webp.large_image_url})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14]/60 to-transparent" />
        
        <button 
          onClick={() => router.back()}
          className="absolute top-8 left-8 p-3 rounded-full glass hover:bg-white/10 transition-all z-20"
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 -mt-40 relative z-10 pb-20">
        <div className="grid lg:grid-cols-[1fr_350px] gap-12">
          {/* Left Column: Info & Episodes */}
          <div className="space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-4 mb-4">
                <span className="px-3 py-1 rounded bg-neonCyan/20 text-neonCyan text-xs font-bold border border-neonCyan/30">
                  {anime.score || 'N/A'} Score
                </span>
                <span className="text-white/60 text-sm">{anime.genres?.map(g => g.name).join(', ') || ''}</span>
              </div>
              <h1 className="text-5xl font-outfit font-black mb-6">{anime.title}</h1>
              <p className="text-lg text-white/70 leading-relaxed">
                {anime.synopsis}
              </p>
            </motion.div>

            {/* Episodes List */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <List className="text-neonCyan" />
                  Episodes
                </h2>
                <span className="text-sm font-bold text-white/40">{episodes.length} Total</span>
              </div>

              {chunkCount > 1 && (
                <div className="mb-4 relative group w-64">
                  <select 
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-neonCyan transition-colors cursor-pointer appearance-none shadow-inner"
                    value={epChunkPage}
                    onChange={(e: any) => setEpChunkPage(Number(e.target.value))}
                  >
                    {Array.from({ length: chunkCount }).map((_, i) => {
                      const start = i * chunkSize + 1;
                      const end = Math.min((i + 1) * chunkSize, episodes.length);
                      const realStart = episodes[i * chunkSize]?.number || episodes[i * chunkSize]?.mal_id || start;
                      const realEnd = episodes[end - 1]?.number || episodes[end - 1]?.mal_id || end;
                      return (
                        <option key={i} value={i} className="bg-[#0f1115] text-white">
                          Episodes {realStart} - {realEnd}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs">▼</span>
                  </div>
                </div>
              )}

              <div className="grid gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {currentChunk.length > 0 ? currentChunk.map((ep, idx) => {
                  const displayNum = epChunkPage * chunkSize + idx + 1; // Calculate display number based on chunk and index
                  const internalNum = ep.number || ep.mal_id || displayNum; // Preserve original logic for internal number
                  return (
                    <div 
                      key={idx} 
                      onClick={() => router.push(`/watch/${id}/${internalNum}`)} // Use internalNum for navigation
                      className="glass p-4 rounded-xl border border-white/5 hover:border-neonCyan/30 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-black text-white/10 group-hover:text-neonCyan/20 transition-colors w-12">
                          {displayNum.toString().padStart(2, '0')} {/* Use displayNum for UI */}
                        </span>
                        <div>
                          <h4 className="font-bold text-white/90 group-hover:text-neonCyan transition-colors truncate max-w-[200px]">
                            {ep.title ? ep.title.replace(/Episode \d+/, '').trim() || `Episode ${displayNum}` : `Episode ${displayNum}`} {/* Use displayNum for UI */}
                          </h4>
                          <span className="text-xs text-white/40">Aired: {ep.aired || 'N/A'}</span>
                        </div>
                      </div>
                      <Play size={20} className="text-white/20 group-hover:text-neonCyan group-hover:scale-110 transition-all" />
                    </div>
                  );
                }) : (
                  <div className="text-white/40 italic">No episode data available yet.</div>
                )}
              </div>
            </div>

            {/* Reviews Section */}
            <ReviewSection animeId={anime.mal_id} />
          </div>

          {/* Right Column: Player/Trailer & Stats */}
          <div className="space-y-8">
            <div className="sticky top-8">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Film className="text-pulsingViolet" />
                Trailer
              </h3>
              {anime.trailer?.embed_url ? (
                <NebulaPlayer 
                  url={anime.trailer.embed_url}
                  poster={anime.images.webp.large_image_url}
                  title={anime.title}
                  malId={anime.mal_id}
                  type="youtube"
                />
              ) : (
                <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                  <div className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm" style={{ backgroundImage: `url(${anime.images.webp.large_image_url})` }} />
                  <div className="z-10 flex flex-col items-center text-white/50">
                    <Film size={48} className="mb-4 opacity-50" />
                    <span className="font-bold tracking-widest text-sm uppercase">No Trailer Available</span>
                  </div>
                </div>
              )}
              
              <div className="mt-8 glass rounded-2xl p-6 border border-white/5 space-y-4">
                <StatItem icon={<Star className="text-yellow-400" />} label="Rating" value={anime.score?.toString() || 'N/A'} />
                <StatItem icon={<Clock className="text-neonCyan" />} label="Status" value={(anime as any).status || 'Airing'} />
                <StatItem icon={<Calendar className="text-pulsingViolet" />} label="Season" value="Fall 2023" />
              </div>

              <button 
                onClick={() => router.push(`/watch/${id}/1`)}
                className="w-full mt-6 py-4 bg-white text-black rounded-xl font-bold hover:bg-neonCyan transition-all flex items-center justify-center gap-2 group shadow-xl"
              >
                 <Play className="fill-current" />
                 Start Watching Ep 1
                 <ChevronRight className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <div className="mt-4">
                <WatchPartyButton 
                  animeId={Number(id)}
                  episode={1}
                  animeTitle={anime.title}
                  animePoster={anime.images.webp.large_image_url}
                  totalEpisodes={episodes.length}
                />
              </div>
              
              <div className="flex gap-4">
                <FavoriteButton anime={anime} type="favorite" />
                <FavoriteButton anime={anime} type="library" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 text-white/50 text-sm">
        {icon}
        {label}
      </div>
      <span className="font-bold text-sm">{value}</span>
    </div>
  );
}
