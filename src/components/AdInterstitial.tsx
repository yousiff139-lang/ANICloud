'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Play, Info, ShieldAlert, X, MousePointer2, AlertCircle } from 'lucide-react';

interface AdInterstitialProps {
  onComplete: () => void;
  animeTitle: string;
}

export default function AdInterstitial({ onComplete, animeTitle }: AdInterstitialProps) {
  const [clickCount, setClickCount] = useState(0);
  const [showAd, setShowAd] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [timer, setTimer] = useState(5);

  const adLink = process.env.NEXT_PUBLIC_ADSTERRA_LINK || "https://www.google.com";

  const ads = [
    {
      title: "Sponsor Offer",
      description: "Click here to discover our sponsor and unlock your episode!",
      link: adLink,
      image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    },
    {
      title: "Final Step",
      description: "One last step! Visit our sponsor to start streaming immediately.",
      link: adLink,
      image: "https://images.unsplash.com/photo-1613373974535-77292c54ba51?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    }
  ];

  useEffect(() => {
    if (timer > 0 && clickCount < 2) {
      const interval = setInterval(() => setTimer(prev => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer, clickCount]);

  const handleAdClick = () => {
    window.open(ads[clickCount % ads.length].link, '_blank');
    const nextCount = clickCount + 1;
    setClickCount(nextCount);
    setTimer(5); // Reset timer for second ad
    
    if (nextCount >= 2) {
      // Small delay before completion to show success state
      setTimeout(() => {
        onComplete();
      }, 800);
    }
  };

  const activeAd = ads[clickCount % ads.length];

  return (
    <div className="fixed inset-0 z-[999] bg-[#05070A] flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-neonCyan/20 via-transparent to-pulsingViolet/20" />
        <div className="grid grid-cols-8 grid-rows-8 h-full w-full">
          {Array.from({ length: 64 }).map((_, i) => (
            <div key={i} className="border-[0.5px] border-white/5" />
          ))}
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl glass-card rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl relative"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/5">
          <motion.div 
            initial={{ width: "0%" }}
            animate={{ width: `${(clickCount / 2) * 100}%` }}
            className="h-full bg-gradient-to-r from-neonCyan to-pulsingViolet"
          />
        </div>

        <div className="p-8 lg:p-12 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-3xl font-black tracking-tight">{clickCount === 0 ? 'Sponsor Message' : 'One More Step'}</h2>
              <p className="text-white/40 text-sm font-bold uppercase tracking-widest">Support ANICloud to watch {animeTitle}</p>
            </div>
            <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-neonCyan animate-pulse" />
              <span className="text-xs font-black text-neonCyan">{clickCount}/2 Ads Viewed</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={clickCount}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="group relative rounded-[2rem] overflow-hidden border border-white/10 cursor-pointer aspect-video"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={handleAdClick}
            >
              <img 
                src={activeAd.image} 
                alt="Advertisement" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              
              <div className="absolute bottom-0 left-0 right-0 p-8 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-yellow-400 text-black text-[10px] font-black uppercase rounded tracking-widest">Sponsored</span>
                  <span className="text-white/60 text-xs font-bold">{activeAd.title}</span>
                </div>
                <h3 className="text-2xl font-black text-white group-hover:text-neonCyan transition-colors">{activeAd.description}</h3>
              </div>

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-black">
                    <MousePointer2 size={32} />
                  </div>
                  <span className="font-black text-sm uppercase tracking-widest">Visit Sponsor</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-3 text-white/40">
              <ShieldAlert size={18} />
              <span className="text-xs font-bold">Safe, secure, and helps us keep the servers running.</span>
            </div>

            <button
              onClick={handleAdClick}
              disabled={timer > 0 && clickCount < 2}
              className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${
                timer > 0 && clickCount < 2
                ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                : 'bg-white text-black hover:bg-neonCyan shadow-xl active:scale-95'
              }`}
            >
              {clickCount >= 2 ? (
                <>
                  <Play size={16} fill="currentColor" />
                  Continue to Video
                </>
              ) : timer > 0 ? (
                <>
                  <AlertCircle size={16} />
                  Wait {timer}s...
                </>
              ) : (
                <>
                  <ExternalLink size={16} />
                  Claim Offer
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-white/5 p-4 text-center border-t border-white/5">
          <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-black">
            Advertisements Manage Account on Google Ads
          </p>
        </div>
      </motion.div>
    </div>
  );
}
