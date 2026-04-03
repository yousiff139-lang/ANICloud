'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { getAnimeById, getEpisodes, getStreamUrl, Anime } from '@/lib/api';
import { useSession } from 'next-auth/react';
import NebulaPlayer from '@/components/NebulaPlayer';
import AdInterstitial from '@/components/AdInterstitial';

type StreamData = any;

export default function WatchEpisode() {
  const { data: session, status } = useSession();
  const { id, episode } = useParams();
  const router = useRouter();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [skipData, setSkipData] = useState<any[]>([]);
  const [savedTime, setSavedTime] = useState<number | undefined>(undefined);
  const [adsComplete, setAdsComplete] = useState(false);
  const lastSaveRef = useRef<number>(0);
  const epNum = Number(episode);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/watch/${id}/${episode}`);
    }
  }, [status, id, episode, router]);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id || status !== 'authenticated') return;
      
      // Phase 1: Fetch essential details to show the loading/ad screen fast
      try {
        const [animeData, epData] = await Promise.all([
          getAnimeById(Number(id)),
          getEpisodes(Number(id))
        ]);
        
        if (animeData) {
          setAnime(animeData);
          setEpisodes(epData);
          
          // Hydrate Session Tracking Cache (Non-blocking)
          const recent = JSON.parse(localStorage.getItem('anicloud_recent') || '[]');
          const existing = recent.find((x: any) => x.malId === Number(id) && x.episode === epNum);
          if (existing?.timestamp) setSavedTime(existing.timestamp);

          // Phase 2: Fetch heavy stream data in background while user is likely on the Ad screen
          const [stream, skipRes] = await Promise.all([
            getStreamUrl(Number(id), epNum, animeData.title, animeData.title_english, animeData.year),
            fetch(`https://api.aniskip.com/v2/skip-times/${id}/${epNum}?types[]=op&types[]=ed&episodeLength=0`)
              .then(r => r.json())
              .catch(() => ({ results: [] }))
          ]);

          setStreamData(stream);
          setSkipData(skipRes?.found && skipRes?.results ? skipRes.results : []);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id, episode, status]);

  const handleProgress = (time: number, duration: number) => {
    const now = Date.now();
    if (now - lastSaveRef.current > 5000 && time > 5 && anime) {
       lastSaveRef.current = now;
       try {
         const recent = JSON.parse(localStorage.getItem('anicloud_recent') || '[]');
         const filtered = recent.filter((x: any) => x.malId !== anime.mal_id);
         
         const displayNum = episodes.length > 0 
           ? (episodes.findIndex(ep => (ep.number || ep.mal_id || 0) === epNum) + 1 || epNum) 
           : epNum;
         
         filtered.unshift({
           malId: anime.mal_id,
           title: anime.title,
           image: anime.images.webp.large_image_url,
           episode: epNum,
           displayEpisode: displayNum,
           timestamp: time,
           duration: duration,
           lastWatchedAt: now
         });
         
         localStorage.setItem('anicloud_recent', JSON.stringify(filtered.slice(0, 50)));
       } catch (e) {
         console.error("Local tracking save error", e);
       }
    }
  };

  // Improved loading logic: Only show the "Full Screen Spinner" for the initial metadata.
  // Once we have anime info, we show the AdInterstitial which handles its own background loading state.
  if (status === 'loading' || (loading && !anime)) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#05070A] flex-col gap-4">
        <Loader2 className="text-neonCyan w-12 h-12 animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  if (!anime) return <div>Anime not found</div>;

  if (streamData?.error) {
    return (
      <div className="h-screen bg-black overflow-hidden flex flex-col items-center justify-center text-white relative">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `url(${anime.images.webp.large_image_url})`, backgroundSize: 'cover', filter: 'blur(20px)' }} />
        <div className="z-10 bg-white/5 border border-white/10 p-8 rounded-2xl flex flex-col items-center text-center max-w-md backdrop-blur-md">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
            <span className="text-red-500 text-3xl font-black">!</span>
          </div>
          <h2 className="text-2xl font-bold mb-3 tracking-tight">Stream Unavailable</h2>
          <p className="text-white/60 text-sm mb-6 leading-relaxed">
            We couldn&apos;t locate streams for <strong>{anime.title}</strong> Episode {episode}.
          </p>
          <div className="flex gap-3">
            <button onClick={() => router.push(`/anime/${id}`)} className="px-6 py-2.5 rounded-full bg-neonCyan text-black font-bold text-sm tracking-widest uppercase hover:bg-white transition-all transform hover:scale-105">
              Return to Anime
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black overflow-hidden select-none relative">
      <AnimatePresence>
        {!adsComplete ? (
          <AdInterstitial 
            animeTitle={anime.title} 
            onComplete={() => setAdsComplete(true)} 
          />
        ) : !streamData ? (
          <div className="flex h-screen items-center justify-center bg-[#05070A] flex-col gap-4">
            <Loader2 className="text-neonCyan w-12 h-12 animate-spin" />
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Preparing Stream...</p>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full"
          >
            <NebulaPlayer 
              url={streamData}
              poster={anime.images.webp.large_image_url}
              title={`${anime.title} - Episode ${epNum}`}
              type={streamData.type || 'hls'}
              episodes={episodes}
              currentEp={epNum}
              malId={anime.mal_id}
              skipTimesData={skipData}
              initialTime={savedTime}
              onProgress={handleProgress}
              onEpSelect={(ep) => router.push(`/watch/${id}/${ep}`)}
              onBack={() => router.push(`/anime/${id}`)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


