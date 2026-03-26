'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Copy, Check, Lock, Crown, ChevronDown, Play, Info } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

interface WatchPartyButtonProps {
  animeId: number;
  episode: number;
  animeTitle: string;
  animePoster?: string;
  totalEpisodes?: number;
}

export default function WatchPartyButton({ animeId, episode: defaultEpisode, animeTitle, animePoster, totalEpisodes = 12 }: WatchPartyButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { canAccessWatchParties, isUltimate } = useSubscription();
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [loading, setLoading] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [maxMembers, setMaxMembers] = useState(10);
  const [selectedEpisode, setSelectedEpisode] = useState(defaultEpisode || 1);
  const [showEpisodePicker, setShowEpisodePicker] = useState(false);


  const createParty = async () => {
    if (!session) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/party/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animeId,
          episode: selectedEpisode,
          animeTitle,
          animePoster,
          isPublic,
          maxMembers
        })
      });

      if (!res.ok) throw new Error('Failed to create party');

      const data = await res.json();
      setCreatedCode(data.roomCode);
      
      // Auto-navigate after showing code
      setTimeout(() => {
        router.push(`/party/${data.roomCode}`);
      }, 2000);
    } catch (error) {
      console.error('Error creating party:', error);
      alert('Failed to create watch party');
    } finally {
      setLoading(false);
    }
  };

  const joinParty = async () => {
    if (!session) {
      router.push('/login');
      return;
    }

    if (!roomCode.trim()) {
      alert('Please enter a room code');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/party/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: roomCode.toUpperCase(),
          nickname: session.user?.name || 'Guest'
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to join party');
      }

      const data = await res.json();
      router.push(`/party/${data.party.roomCode}`);
    } catch (error: any) {
      console.error('Error joining party:', error);
      alert(error.message || 'Failed to join watch party');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg"
      >
        <Users size={20} />
        Watch Party
      </button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md glass rounded-2xl p-6 border border-white/10"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Watch Party</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {createdCode ? (
                <div className="text-center space-y-4">
                  <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10 shadow-inner">
                    <p className="text-xs uppercase tracking-[0.2em] font-black text-white/40 mb-4">Your Room Code</p>
                    <div className="flex items-center justify-center gap-4">
                      <p className="text-5xl font-mono font-black tracking-tighter text-neonCyan drop-shadow-[0_0_15px_rgba(0,242,255,0.4)]">
                        {createdCode}
                      </p>
                      <button
                        onClick={copyCode}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
                      >
                        {copied ? <Check size={24} className="text-green-400" /> : <Copy size={24} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-neonCyan font-bold animate-pulse">
                    <Info size={14} />
                    Redirecting to party room...
                  </div>
                </div>
              ) : (
                <>
                  {/* Premium Segmented Toggle */}
                  <div className="bg-black/40 p-1 rounded-2xl flex items-center relative mb-8 border border-white/5">
                    {[
                      { id: 'create', label: 'Create Party' },
                      { id: 'join', label: 'Join Party' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setMode(t.id as 'create' | 'join')}
                        className={`flex-1 relative py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 z-10 ${
                          mode === t.id ? 'text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]' : 'text-white/40 hover:text-white/60'
                        }`}
                      >
                        {t.label}
                        {mode === t.id && (
                          <motion.div
                            layoutId="partyModalToggle"
                            className="absolute inset-0 bg-neonCyan rounded-xl shadow-[0_0_20px_rgba(0,242,255,0.4)] -z-10"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                      </button>
                    ))}
                  </div>

                  {mode === 'create' ? (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Session Settings</label>
                        <div className="p-5 glass-card rounded-[2rem] border border-white/10 bg-white/5 space-y-5">
                          <div>
                            <p className="text-xs text-white/40 mb-1">Anime</p>
                            <p className="font-black text-lg truncate text-white">{animeTitle}</p>
                          </div>
                          
                          {/* Episode Picker */}
                          <div className="relative">
                            <button 
                              type="button"
                              onClick={() => setShowEpisodePicker(!showEpisodePicker)}
                              className="w-full flex items-center justify-between p-4 bg-black/40 border border-white/10 rounded-2xl hover:border-neonCyan transition-all group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-neonCyan/10 text-neonCyan">
                                  <Play size={14} />
                                </div>
                                <span className="font-bold text-sm">Episode {selectedEpisode}</span>
                              </div>
                              <ChevronDown size={18} className={`text-white/20 transition-transform duration-300 ${showEpisodePicker ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                              {showEpisodePicker && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 10 }}
                                  className="absolute top-full left-0 right-0 mt-2 p-2 glass-card rounded-2xl border border-white/10 bg-[#0B0E14] z-50 max-h-48 overflow-y-auto custom-scrollbar shadow-2xl"
                                >
                                  {Array.from({ length: totalEpisodes }).map((_, i) => (
                                    <button
                                      key={i}
                                      onClick={() => {
                                        setSelectedEpisode(i + 1);
                                        setShowEpisodePicker(false);
                                      }}
                                      className={`w-full text-left p-3 rounded-xl text-sm font-bold transition-all ${
                                        selectedEpisode === i + 1 
                                          ? 'bg-neonCyan text-black' 
                                          : 'hover:bg-white/5 text-white/60'
                                      }`}
                                    >
                                      Episode {i + 1}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Max Fans</label>
                           <input
                            type="number"
                            min="2"
                            max="50"
                            value={maxMembers}
                            onChange={(e) => setMaxMembers(parseInt(e.target.value))}
                            className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-neonCyan transition-all font-bold text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Visibility</label>
                           <button 
                             onClick={() => setIsPublic(!isPublic)}
                             className={`w-full py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest border transition-all ${
                               isPublic ? 'bg-neonCyan/20 text-neonCyan border-neonCyan/40' : 'bg-black/40 text-white/40 border-white/10'
                             }`}
                           >
                             {isPublic ? 'Public' : 'Private'}
                           </button>
                        </div>
                      </div>

                      <button
                        onClick={createParty}
                        disabled={loading}
                        className="w-full py-5 bg-white text-black hover:bg-neonCyan rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-20 shadow-2xl active:scale-95"
                      >
                        {loading ? 'Initializing...' : 'Launch Watch Party'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1 text-center block">Enter Room Code</label>
                        <input
                          type="text"
                          value={roomCode}
                          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                          placeholder="XXXXXX"
                          maxLength={6}
                          className="w-full px-5 py-6 bg-black/40 border border-white/10 rounded-[2rem] outline-none focus:border-neonCyan transition-all font-mono text-4xl text-center tracking-[0.4em] font-black text-neonCyan placeholder:text-white/5"
                        />
                      </div>

                      <button
                        onClick={joinParty}
                        disabled={loading || roomCode.length !== 6}
                        className="w-full py-5 glass text-white hover:bg-white hover:text-black rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all border border-white/10 hover:border-white disabled:opacity-20 active:scale-95 shadow-xl"
                      >
                        {loading ? 'Joining...' : 'Authenticate & Join'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
