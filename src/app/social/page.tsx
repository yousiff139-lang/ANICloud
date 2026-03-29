'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Play, Crown, Search, Globe2, Radio, UserPlus } from 'lucide-react';
import WatchPartyButton from '@/components/WatchPartyButton';

interface PublicParty {
  id: string;
  roomCode: string;
  animeId: number;
  animeTitle: string;
  episode: number;
  animePoster?: string;
  maxMembers: number;
  isPlaying: boolean;
  host: {
    id: string;
    name: string;
    profile?: { avatar?: string }
  };
  members: Array<{ id: string, nickname: string }>;
}

export default function SocialPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [parties, setParties] = useState<PublicParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchParties();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchParties, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchParties = async () => {
    try {
      const res = await fetch('/api/social');
      const data = await res.json();
      setParties(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredParties = parties.filter(p => 
    p.animeTitle.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.host.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white pt-24 pb-12 px-6">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
           <div className="space-y-4">
               <div className="flex items-center gap-3 text-neonCyan mb-2">
                 <Globe2 size={24} className="animate-pulse" />
                 <span className="font-black text-sm uppercase tracking-[0.3em]">Live Social Hub</span>
               </div>
               <h1 className="text-5xl md:text-7xl font-outfit font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">
                 Watch Parties
               </h1>
               <p className="text-white/60 font-medium max-w-xl text-lg">
                 Drop into a live watch party and stream synchronized episodes with anime fans around the world.
               </p>
           </div>
           
           <div className="relative w-full md:w-96">
               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/40">
                 <Search size={20} />
               </div>
               <input 
                 type="text"
                 placeholder="Search by anime or host..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-neonCyan transition-all"
               />
           </div>
        </div>

        {/* Global Grid */}
        {loading ? (
             <div className="flex justify-center p-24">
               <div className="w-12 h-12 border-4 border-neonCyan border-t-transparent rounded-full animate-spin" />
             </div>
        ) : filteredParties.length === 0 ? (
             <div className="glass rounded-[3rem] p-16 text-center border border-white/5 border-dashed space-y-4 flex flex-col items-center justify-center">
                 <Radio size={48} className="text-white/20 mb-4" />
                 <h2 className="text-2xl font-black text-white/60">No Active Public Parties</h2>
                 <p className="text-white/40">Want to watch something with the community? Start a public party on any anime page!</p>
             </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               <AnimatePresence>
                 {filteredParties.map(party => (
                   <motion.div
                     key={party.id}
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     className="glass rounded-3xl overflow-hidden border border-white/10 hover:border-neonCyan/50 transition-all group flex flex-col"
                   >
                     {/* Poster / Video Header (Simulated) */}
                     <div className="h-40 relative bg-black flex-shrink-0">
                       {party.animePoster ? (
                         <>
                           <img src={party.animePoster} alt={party.animeTitle} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-700" />
                           <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                         </>
                       ) : (
                         <div className="absolute inset-0 bg-gradient-to-br from-neonCyan/20 to-pulsingViolet/20" />
                       )}
                       
                       {/* Top Badges */}
                       <div className="absolute top-4 left-4 flex gap-2">
                          <div className="bg-red-500 text-white px-2 py-1 rounded text-[10px] uppercase font-black tracking-widest flex items-center gap-1 shadow-lg shadow-red-500/20">
                             <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> LIVE
                          </div>
                       </div>
                       
                       {/* Bottom Metadata */}
                       <div className="absolute bottom-4 left-4 right-4">
                          <h3 className="font-black text-lg truncate drop-shadow-lg">{party.animeTitle}</h3>
                          <div className="flex items-center gap-2 text-white/80 text-xs font-bold drop-shadow-md">
                             <Play size={12} className="text-neonCyan" /> Episode {party.episode}
                          </div>
                       </div>
                     </div>

                     {/* Content */}
                     <div className="p-5 flex flex-col flex-1 bg-black/40">
                       <div className="flex items-center justify-between mb-6">
                         
                         <div className="flex items-center gap-3">
                            <div className="relative">
                               <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm overflow-hidden border border-white/20">
                                   {party.host.profile?.avatar ? (
                                      <img src={party.host.profile.avatar} className="w-full h-full object-cover" />
                                   ) : (
                                      party.host.name.charAt(0).toUpperCase()
                                   )}
                               </div>
                               <Crown size={12} className="absolute -top-1 -right-1 text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]" />
                            </div>
                            <div>
                               <p className="text-xs text-white/40 uppercase font-black tracking-wider">Host</p>
                               <p className="font-bold text-sm text-neonCyan">{party.host.name}</p>
                            </div>
                         </div>
                         
                         <div className="flex-shrink-0 text-right">
                             <div className="flex items-center gap-1 justify-end text-white/60 mb-1">
                                <Users size={14} /> <span className="text-sm font-bold">{party.members.length} / {party.maxMembers}</span>
                             </div>
                             <div className="flex -space-x-2 justify-end">
                               {party.members.slice(0, 3).map((member, i) => (
                                 <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-pulsingViolet to-neonCyan border border-black flex items-center justify-center text-[8px] font-bold z-10">
                                    {member.nickname.charAt(0).toUpperCase()}
                                 </div>
                               ))}
                               {party.members.length > 3 && (
                                 <div className="w-6 h-6 rounded-full bg-white/10 border border-black flex items-center justify-center text-[10px] font-bold z-0 backdrop-blur-sm">
                                    +{party.members.length - 3}
                                 </div>
                               )}
                             </div>
                         </div>
                       </div>
                       
                       <div className="mt-auto">
                          <button 
                            onClick={() => router.push(`/party/${party.roomCode}`)}
                            disabled={party.members.length >= party.maxMembers}
                            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 transform active:scale-95 ${
                               party.members.length >= party.maxMembers 
                                 ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5' 
                                 : 'bg-white text-black hover:bg-neonCyan shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(0,242,255,0.4)]'
                            }`}
                          >
                            <UserPlus size={16} /> {party.members.length >= party.maxMembers ? 'Room Full' : 'Join Party'}
                          </button>
                       </div>
                     </div>
                   </motion.div>
                 ))}
               </AnimatePresence>
            </div>
        )}

      </div>
    </div>
  );
}
