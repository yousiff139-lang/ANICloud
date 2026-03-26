'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Hls from 'hls.js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, 
  Subtitles, Check, ChevronDown
} from 'lucide-react';

interface SubtitleTrack {
  id: string;
  language: string;
  label: string;
  url: string;
  format: string;
}

interface SubtitlePlayerProps {
  url: string;
  poster: string;
  title: string;
  animeId: number;
  episode: number;
  type?: 'hls' | 'mp4';
  onProgress?: (time: number, duration: number) => void;
}

export default function SubtitlePlayer({
  url,
  poster,
  title,
  animeId,
  episode,
  type = 'hls',
  onProgress
}: SubtitlePlayerProps) {
  const { data: session } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  
  // Subtitle state
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);
  const [subtitleSize, setSubtitleSize] = useState('medium');
  const [subtitleColor, setSubtitleColor] = useState('#FFFFFF');
  const [subtitleBg, setSubtitleBg] = useState('rgba(0,0,0,0.7)');
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize HLS player
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    if (type === 'hls' && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });

      hls.loadSource(url);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest loaded');
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('HLS fatal error:', data);
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = url;
    } else if (type === 'mp4') {
      video.src = url;
    }
  }, [url, type]);

  // Load subtitles
  useEffect(() => {
    const loadSubtitles = async () => {
      try {
        const res = await fetch(`/api/subtitles/${animeId}/${episode}`);
        if (res.ok) {
          const data = await res.json();
          setSubtitles(data);
          
          // Auto-select user's preferred language
          if (session && data.length > 0) {
            const userLang = 'en'; // Would fetch from user preferences
            const preferred = data.find((s: SubtitleTrack) => s.language === userLang);
            if (preferred) {
              setActiveSubtitle(preferred.id);
            }
          }
        }
      } catch (error) {
        console.error('Error loading subtitles:', error);
      }
    };

    loadSubtitles();
  }, [animeId, episode, session]);

  // Apply subtitle to video
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    
    // Remove existing tracks
    while (video.textTracks.length > 0) {
      const track = video.textTracks[0];
      const trackElement = Array.from(video.querySelectorAll('track')).find(
        t => t.track === track
      );
      if (trackElement) {
        video.removeChild(trackElement);
      }
    }

    // Add active subtitle
    if (activeSubtitle) {
      const subtitle = subtitles.find(s => s.id === activeSubtitle);
      if (subtitle) {
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = subtitle.label;
        track.srclang = subtitle.language;
        track.src = subtitle.url;
        track.default = true;
        video.appendChild(track);
        
        // Track download
        fetch('/api/subtitles/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subtitleId: subtitle.id })
        });
      }
    }
  }, [activeSubtitle, subtitles]);

  // Apply subtitle styling
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const textTracks = video.textTracks;

    for (let i = 0; i < textTracks.length; i++) {
      const track = textTracks[i];
      if (track.mode === 'showing') {
        // Apply custom styling via CSS
        const style = document.createElement('style');
        style.textContent = `
          ::cue {
            font-size: ${subtitleSize === 'small' ? '16px' : subtitleSize === 'large' ? '24px' : '20px'};
            color: ${subtitleColor};
            background-color: ${subtitleBg};
            font-family: Arial, sans-serif;
            font-weight: bold;
          }
        `;
        document.head.appendChild(style);
        
        return () => {
          document.head.removeChild(style);
        };
      }
    }
  }, [subtitleSize, subtitleColor, subtitleBg, activeSubtitle]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    
    if (isPlaying) {
      hideTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
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

  const toggleFullscreen = () => {
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

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black group"
      onMouseMove={handleMouseMove}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={poster}
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        playsInline
        crossOrigin="anonymous"
      />

      {/* Controls Overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col justify-between p-6 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between pointer-events-auto" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold">{title}</h2>
            </div>

            {/* Bottom Controls */}
            <div className="space-y-4 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
              {/* Progress Bar */}
              <input 
                type="range"
                min="0"
                max="100"
                step="0.01"
                value={isNaN(progress) ? 0 : progress}
                onChange={handleSeek}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #B026FF 0%, #B026FF ${isNaN(progress) ? 0 : progress}%, rgba(255,255,255,0.15) ${isNaN(progress) ? 0 : progress}%, rgba(255,255,255,0.15) 100%)`
                }}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={togglePlay} className="p-3 rounded-full bg-white text-black hover:bg-neonCyan transition-all">
                    {isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current" />}
                  </button>

                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsMuted(!isMuted)} className="text-white/60 hover:text-neonCyan">
                      {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                    <input 
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => { 
                        setVolume(Number(e.target.value)); 
                        if (videoRef.current) videoRef.current.volume = Number(e.target.value); 
                      }}
                      className="w-20 h-1 bg-white/20 accent-neonCyan"
                    />
                  </div>

                  <span className="text-sm text-white/60">
                    {videoRef.current ? formatTime(videoRef.current.currentTime) : '0:00'} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Subtitle Menu */}
                  <div className="relative">
                    <button 
                      onClick={() => setShowSubtitleMenu(!showSubtitleMenu)}
                      className={`p-3 rounded-xl transition-all flex items-center gap-2 ${activeSubtitle ? 'bg-neonCyan/20 text-neonCyan' : 'glass hover:bg-white/10'}`}
                    >
                      <Subtitles size={20} />
                      <ChevronDown size={16} />
                    </button>

                    <AnimatePresence>
                      {showSubtitleMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full right-0 mb-2 w-80 glass rounded-xl p-4 border border-white/10"
                        >
                          <h4 className="text-sm font-bold mb-3">Subtitles</h4>
                          
                          {/* Language Selection */}
                          <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                            <button
                              onClick={() => setActiveSubtitle(null)}
                              className={`w-full p-2 rounded-lg text-left text-sm flex items-center justify-between ${!activeSubtitle ? 'bg-neonCyan/20 text-neonCyan' : 'hover:bg-white/5'}`}
                            >
                              Off
                              {!activeSubtitle && <Check size={16} />}
                            </button>
                            {subtitles.map((sub) => (
                              <button
                                key={sub.id}
                                onClick={() => setActiveSubtitle(sub.id)}
                                className={`w-full p-2 rounded-lg text-left text-sm flex items-center justify-between ${activeSubtitle === sub.id ? 'bg-neonCyan/20 text-neonCyan' : 'hover:bg-white/5'}`}
                              >
                                <span>{sub.label}</span>
                                {activeSubtitle === sub.id && <Check size={16} />}
                              </button>
                            ))}
                          </div>

                          {/* Subtitle Customization */}
                          {activeSubtitle && (
                            <div className="space-y-3 pt-3 border-t border-white/10">
                              <div>
                                <label className="text-xs text-white/60 mb-1 block">Size</label>
                                <div className="flex gap-2">
                                  {['small', 'medium', 'large'].map((size) => (
                                    <button
                                      key={size}
                                      onClick={() => setSubtitleSize(size)}
                                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${subtitleSize === size ? 'bg-neonCyan/20 text-neonCyan' : 'bg-white/5'}`}
                                    >
                                      {size}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-xs text-white/60 mb-1 block">Color</label>
                                <div className="flex gap-2">
                                  {['#FFFFFF', '#FFFF00', '#00FF00', '#FF0000'].map((color) => (
                                    <button
                                      key={color}
                                      onClick={() => setSubtitleColor(color)}
                                      className={`w-8 h-8 rounded-lg border-2 ${subtitleColor === color ? 'border-neonCyan' : 'border-white/20'}`}
                                      style={{ backgroundColor: color }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button onClick={toggleFullscreen} className="p-3 rounded-xl glass hover:bg-white/10">
                    <Maximize size={20} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
