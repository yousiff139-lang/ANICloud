'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Settings, 
  List, ArrowLeft, RotateCcw, FastForward, Check 
} from 'lucide-react';

interface NebulaPlayerProps {
  url: string | { master: string; resolutions: Record<string, string>; referer?: string };
  poster: string;
  title: string;
  type?: 'hls' | 'youtube' | 'iframe' | 'mp4';
  episodes?: any[];
  currentEp?: number;
  malId?: number;
  skipTimesData?: any[];
  initialTime?: number;
  onProgress?: (time: number, duration: number) => void;
  onEpSelect?: (ep: number) => void;
  onBack?: () => void;
}

export default function NebulaPlayer({ 
  url, 
  poster, 
  title, 
  type = 'hls', 
  episodes = [], 
  currentEp = 1,
  malId,
  skipTimesData = [],
  initialTime,
  onProgress,
  onEpSelect,
  onBack 
}: NebulaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showEpList, setShowEpList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [quality, setQuality] = useState('1080p');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hlsError, setHlsError] = useState<string | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);

  // Timeline Hover Trace State
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number>(0);

  // AniSkip State
  const skipTimes = skipTimesData;
  const [activeSkip, setActiveSkip] = useState<{ 
    skipType: string; 
    interval: { startTime: number; endTime: number } 
  } | null>(null);

  // Pagination for long-running series
  const [epChunkPage, setEpChunkPage] = useState(0);
  const chunkSize = 100;
  const chunkCount = Math.ceil(episodes.length / chunkSize);
  const currentChunk = episodes.slice(epChunkPage * chunkSize, (epChunkPage + 1) * chunkSize);

  // Calculate generic visual display numbering
  const displayEpNum = episodes.length > 0 
    ? (episodes.findIndex(ep => (ep.number || ep.mal_id || 0) === currentEp) + 1 || currentEp) 
    : currentEp;

  // Auto-focus the correct chunk tab when the episode changes
  useEffect(() => {
    if (episodes.length > 0) {
      const idx = episodes.findIndex(ep => (ep.number || ep.mal_id || 0) === currentEp);
      if (idx !== -1) setEpChunkPage(Math.floor(idx / chunkSize));
      else setEpChunkPage(Math.floor(Math.max(0, currentEp - 1) / chunkSize));
    }
  }, [currentEp, episodes]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (isPlaying && !showSettings && !showEpList) {
      hideTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  };

  const handleMouseLeave = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (isPlaying) setShowControls(false);
  };

  useEffect(() => {
    let isMounted = true;
    if (type !== 'hls' && type !== 'mp4') return;
    const video = videoRef.current;
    if (!video) return;

    // Preserve time when switching quality
    const currentTime = video.currentTime;
    setHlsError(null);

    // Quality/Resolution swapping logic
    let streamUrl = (typeof url === 'string') ? url : (url.resolutions[quality] || url.master);
    const referer = (typeof url === 'object') ? url.referer : null;

    // Apply Proxy if referer is required
    if (referer) {
      streamUrl = `/api/proxy?url=${encodeURIComponent(streamUrl)}&referer=${encodeURIComponent(referer)}`;
    }

    if (type === 'mp4') {
      video.src = streamUrl;
      video.currentTime = currentTime;
      if (isPlaying) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            if (error.name !== 'AbortError') console.error('Play error:', error);
          });
        }
      }
      return () => { isMounted = false; };
    }

    if (Hls.isSupported()) {
      const hls = new Hls({ 
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000, // 60MB
        fragLoadingMaxRetry: 3,
        levelLoadingMaxRetry: 3,
        manifestLoadingMaxRetry: 3,
        startLevel: -1, // Auto
        autoStartLoad: true,
        xhrSetup: (xhr) => { xhr.withCredentials = false; } 
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (isMounted) {
          if (currentTime > 0) {
             video.currentTime = currentTime;
          } else if (initialTime && !hasInitialized.current) {
             video.currentTime = initialTime;
             hasInitialized.current = true;
          }
          
          if (isPlaying) {
            const playPromise = video.play();
            if (playPromise !== undefined) playPromise.catch(() => {});
          }
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error('HLS Error:', data.type, data.details, data);
        if (data.fatal) {
          console.error('Fatal HLS error — attempting recovery...');
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            if (isMounted) setHlsError(`Stream error: ${data.details}`);
          }
        }
      });

      return () => {
        isMounted = false;
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      if (isPlaying) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            if (error.name !== 'AbortError') console.error('Play error:', error);
          });
        }
      }
    }
    return () => { isMounted = false; };
  }, [url, type, quality]);

  const skipBackward = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) videoRef.current.currentTime -= 10;
  };

  const skipForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) videoRef.current.currentTime += 10;
  };

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            if (error.name !== 'AbortError') console.error('Play error:', error);
          });
        }
      }
      setIsPlaying(!isPlaying);
      handleMouseMove();
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration > 0) {
      const currentT = videoRef.current.currentTime;
      const dur = videoRef.current.duration;
      const p = (currentT / dur) * 100;
      
      setProgress(isNaN(p) ? 0 : p);
      setDuration(dur);
      
      if (onProgress) {
        onProgress(currentT, dur);
      }

      // Check AniSkip
      const skip = skipTimes.find((s: any) => currentT >= s.interval.startTime && currentT < s.interval.endTime);
      if (skip) {
         if (!activeSkip || activeSkip.skipType !== skip.skipType) setActiveSkip(skip);
      } else {
         if (activeSkip) setActiveSkip(null);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current && videoRef.current.duration > 0) {
      const time = (Number(e.target.value) / 100) * videoRef.current.duration;
      if (isFinite(time)) {
        videoRef.current.currentTime = time;
        setProgress(Number(e.target.value));
      }
    }
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimelineHover = (e: React.MouseEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    let pos = (e.clientX - rect.left) / rect.width;
    pos = Math.max(0, Math.min(1, pos));
    
    setHoverPosition(pos * 100);
    if (duration > 0) {
       setHoverTime(pos * duration);
    }
  };

  const handleTimelineLeave = () => {
    setHoverPosition(null);
  };

  if (type === 'youtube' || type === 'iframe') {
    const iframeSrc = typeof url === 'string' ? url : url.master;
    return (
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden group border border-white/5 bg-black">
         {onBack && (
           <button 
             onClick={onBack}
             className="absolute top-4 left-4 z-50 p-3 rounded-full glass hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100"
           >
             <ArrowLeft size={20} />
           </button>
         )}
         <div className="absolute top-0 left-0 right-0 z-40 p-4 bg-gradient-to-b from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
           <h3 className="text-white font-medium text-sm ml-14">{title}</h3>
         </div>
         <iframe 
           src={iframeSrc}
           className="w-full h-full border-0"
           allow="autoplay; encrypted-media; fullscreen; picture-in-picture; gyroscope; accelerometer"
           allowFullScreen
         />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative w-full aspect-video rounded-3xl overflow-hidden bg-black group transition-all ring-1 ring-white/10 ${!showControls && isPlaying ? 'cursor-none' : 'cursor-pointer'}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={poster}
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        playsInline
      />

      <AnimatePresence>
        {activeSkip && (
          <motion.button 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={(e) => {
              e.stopPropagation();
              if (videoRef.current) {
                 videoRef.current.currentTime = activeSkip.interval.endTime;
                 setActiveSkip(null);
              }
            }}
            className="absolute bottom-32 right-12 z-40 bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 backdrop-blur-md px-6 py-3 rounded-xl font-bold font-outfit shadow-2xl transition-all tracking-tight flex items-center gap-2 group/skip"
          >
            {activeSkip.skipType === 'op' ? 'Skip Intro' : 'Skip Ending'}
            <FastForward size={18} className="text-neonCyan group-hover/skip:text-black transition-colors" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col justify-between p-8 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none"
          >
            <div className="flex items-center justify-between pointer-events-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-4">
                {onBack && (
                  <button 
                    onClick={onBack}
                    className="p-3 rounded-full glass hover:bg-white/10 transition-all"
                  >
                    <ArrowLeft size={24} />
                  </button>
                )}
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
                  <div className="flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-neonCyan animate-pulse" />
                     <span className="text-[10px] uppercase tracking-widest text-neonCyan font-black">Playing Episode {displayEpNum}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
              <div 
                className="relative group/progress py-2 cursor-pointer"
                onMouseLeave={handleTimelineLeave}
              >
                <input 
                  type="range"
                  min="0"
                  max="100"
                  step="0.01"
                  value={isNaN(progress) ? 0 : progress}
                  onChange={handleSeek}
                  onMouseMove={handleTimelineHover}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer transition-all block relative z-10 hover:h-2"
                  style={{
                    background: `linear-gradient(to right, #B026FF 0%, #B026FF ${isNaN(progress) ? 0 : progress}%, rgba(255,255,255,0.15) ${isNaN(progress) ? 0 : progress}%, rgba(255,255,255,0.15) 100%)`,
                    accentColor: '#B026FF'
                  }}
                />
                <div className="flex justify-between mt-2 text-[10px] font-bold text-white/40 tracking-tighter">
                   <span>{videoRef.current ? formatTime(videoRef.current.currentTime) : '0:00'}</span>
                   <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <button onClick={skipBackward} className="p-2.5 rounded-full glass hover:bg-white/10 text-white transition-all transform active:scale-95 shadow-xl">
                    <RotateCcw size={20} />
                  </button>
                  <button onClick={togglePlay} className="p-4 rounded-full bg-white text-black hover:bg-neonCyan transition-all transform active:scale-95 shadow-xl">
                    {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current translate-x-0.5" />}
                  </button>
                  <button onClick={skipForward} className="p-2.5 rounded-full glass hover:bg-white/10 text-white transition-all transform active:scale-95 shadow-xl">
                    <FastForward size={20} />
                  </button>
                  
                  <div className="flex items-center gap-2 group/volume">
                    <button onClick={() => setIsMuted(!isMuted)} className="text-white/60 hover:text-neonCyan transition-colors">
                      {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                    <input 
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isNaN(volume) ? 1 : volume}
                      onChange={(e) => { setVolume(Number(e.target.value)); if (videoRef.current) videoRef.current.volume = Number(e.target.value); }}
                      className="w-0 group-hover/volume:w-20 overflow-hidden transition-all h-1 bg-white/20 accent-neonCyan appearance-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <button 
                    onClick={() => { setShowEpList(!showEpList); setShowSettings(false); }}
                    className={`p-3 rounded-xl transition-all flex items-center gap-2 ${showEpList ? 'bg-neonCyan/20 text-neonCyan' : 'glass hover:bg-white/10 text-white/60'}`}
                  >
                    <List size={20} />
                    <span className="text-xs font-bold uppercase">Episodes</span>
                  </button>
                  <button 
                    onClick={() => { setShowSettings(!showSettings); setShowEpList(false); }}
                    className={`p-3 rounded-xl transition-all ${showSettings ? 'bg-pulsingViolet/20 text-pulsingViolet' : 'glass hover:bg-white/10 text-white/60'}`}
                  >
                    <Settings size={20} />
                  </button>
                  <button onClick={toggleFullscreen} className="p-3 rounded-xl glass hover:bg-white/10 text-white/60 transition-all">
                    <Maximize size={20} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEpList && (
          <motion.div 
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-0 right-0 h-full w-80 glass z-50 border-l border-white/10 p-6 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-outfit font-black text-lg tracking-tight">Episodes</h3>
              <button onClick={() => setShowEpList(false)} className="p-2 hover:bg-white/10 rounded-lg"><RotateCcw size={16} /></button>
            </div>
            {chunkCount > 1 && (
              <div className="mb-4 relative group">
                <select 
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-neonCyan transition-colors cursor-pointer appearance-none shadow-inner"
                  value={epChunkPage}
                  onChange={(e) => setEpChunkPage(Number(e.target.value))}
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
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {currentChunk.map((ep, idx) => {
                const displayNum = epChunkPage * chunkSize + idx + 1;
                const internalNum = ep.number || ep.mal_id || displayNum;
                
                return (
                  <button 
                    key={idx}
                    onClick={() => { onEpSelect?.(internalNum); setShowEpList(false); }}
                    className={`w-full p-4 rounded-xl border transition-all flex items-center justify-between group ${currentEp === internalNum ? 'bg-neonCyan/20 border-neonCyan/50' : 'border-white/5 hover:bg-white/5'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xl font-black ${currentEp === internalNum ? 'text-neonCyan' : 'text-white/10'}`}>{displayNum.toString().padStart(2, '0')}</span>
                      <span className={`text-xs font-bold truncate max-w-[150px] ${currentEp === internalNum ? 'text-white' : 'text-white/50'}`}>{ep.title ? ep.title.replace(/Episode \d+/, '').trim() || `Episode ${displayNum}` : `Episode ${displayNum}`}</span>
                    </div>
                    {currentEp === internalNum && <div className="w-1.5 h-1.5 rounded-full bg-neonCyan shadow-[0_0_10px_#00F2FF]" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-32 right-8 w-64 glass z-50 border border-white/10 p-4 rounded-2xl shadow-2xl"
          >
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase text-white/30 tracking-widest block mb-2">Quality</span>
                <div className="space-y-1">
                  {['1080p', '720p', '480p', '360p'].map(q => (
                    <button 
                      key={q} 
                      onClick={() => setQuality(q)}
                      className={`w-full p-2 rounded-lg text-xs font-bold flex items-center justify-between transition-all ${quality === q ? 'bg-white/10 text-neonCyan' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                    >
                      {q}
                      {quality === q && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-white/5">
                <span className="text-[10px] font-black uppercase text-white/30 tracking-widest block mb-2">Mirror / Server</span>
                <div className="flex gap-2">
                   {['Mirror 1', 'Mirror 2'].map(m => (
                     <button 
                        key={m}
                       className={`flex-1 py-1 rounded-md text-[10px] font-black transition-all bg-white/5 text-white/40 hover:bg-white/10`}
                     >
                       {m}
                     </button>
                   ))}
                </div>
              </div>
              <div className="pt-2 border-t border-white/5">
                <span className="text-[10px] font-black uppercase text-white/30 tracking-widest block mb-2">Speed</span>
                <div className="flex gap-2">
                   {[1, 1.25, 1.5, 2].map(speed => (
                     <button 
                        key={speed}
                       onClick={() => { setPlaybackRate(speed); if (videoRef.current) videoRef.current.playbackRate = speed; }}
                       className={`flex-1 py-1 rounded-md text-[10px] font-black transition-all ${playbackRate === speed ? 'bg-neonCyan text-black' : 'bg-white/5 text-white/40'}`}
                     >
                       {speed}x
                     </button>
                   ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}