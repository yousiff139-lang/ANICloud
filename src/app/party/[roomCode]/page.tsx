'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MessageCircle, Copy, Check, LogOut, Crown } from 'lucide-react';
import NebulaPlayer from '@/components/NebulaPlayer';
import WebRTCNetwork from '@/components/WebRTCNetwork';

interface PartyData {
  id: string;
  roomCode: string;
  animeId: number;
  episode: number;
  animeTitle: string;
  animePoster: string | null;
  currentTime: number;
  isPlaying: boolean;
  host: {
    id: string;
    name: string;
  };
  members: Array<{
    id: string;
    nickname: string;
    user: {
      id: string;
      name: string;
    };
  }>;
  messages: Array<{
    id: string;
    username: string;
    message: string;
    type: string;
    createdAt: string;
  }>;
}

export default function WatchPartyPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const roomCode = params.roomCode as string;

  const [party, setParty] = useState<PartyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [copied, setCopied] = useState(false);
  const [reactions, setReactions] = useState<Array<{ emoji: string; id: string }>>([]);

  const videoRef = useRef<any>(null);
  const playerControlRef = useRef<any>(null);
  const isHost = party?.host.id === (session?.user as any)?.id;

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/party/${roomCode}`);
    }
  }, [status, router, roomCode]);

  // Fetch party data
  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchParty = async () => {
      try {
        const res = await fetch(`/api/party/${roomCode}`);
        if (!res.ok) {
          throw new Error('Party not found');
        }
        const data = await res.json();
        setParty(data);
        setMessages(data.messages.reverse());
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchParty();
  }, [roomCode, status]);

  // Initialize Socket.io
  useEffect(() => {
    if (!party) return;

    const socketInstance = io({
      path: '/api/socket'
    });

    socketInstance.on('connect', () => {
      console.log('Connected to socket');
      socketInstance.emit('join-party', roomCode);
    });

    socketInstance.on('playback-synced', (data: { currentTime: number; isPlaying: boolean }) => {
      if (!isHost && playerControlRef.current) {
        console.log('Syncing playback:', data);
        playerControlRef.current.seekTo(data.currentTime);
        if (data.isPlaying) {
           playerControlRef.current.forcePlay();
        } else {
           playerControlRef.current.forcePause();
        }
      }
    });

    socketInstance.on('new-message', (data: any) => {
      setMessages(prev => [...prev, data]);
    });

    socketInstance.on('new-reaction', (data: { emoji: string; username: string }) => {
      const id = Math.random().toString();
      setReactions(prev => [...prev, { emoji: data.emoji, id }]);
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== id));
      }, 3000);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.emit('leave-party', roomCode);
      socketInstance.disconnect();
    };
  }, [party, roomCode, isHost]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !socket) return;

    socket.emit('send-message', {
      roomCode,
      message: newMessage,
      username: session?.user?.name || 'Guest'
    });

    setNewMessage('');
  };

  const sendReaction = (emoji: string) => {
    if (!socket) return;
    socket.emit('send-reaction', {
      roomCode,
      emoji,
      username: session?.user?.name || 'Guest'
    });
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveParty = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neonCyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading watch party...</p>
        </div>
      </div>
    );
  }

  if (error || !party) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Party Not Found</h1>
          <p className="text-white/60 mb-6">{error || 'This watch party does not exist or has expired.'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-neonCyan text-black rounded-xl font-bold hover:bg-white transition-all"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{party.animeTitle}</h1>
            <p className="text-white/60">Episode {party.episode}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={copyRoomCode}
              className="flex items-center gap-2 px-4 py-2 glass rounded-xl hover:bg-white/10 transition-all"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              <span className="font-mono font-bold">{roomCode}</span>
            </button>
            <button
              onClick={leaveParty}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-all"
            >
              <LogOut size={18} />
              Leave
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-3">
            <div className="relative">
              <NebulaPlayer
                url={`/api/stream/${party.animeId}/${party.episode}`}
                poster={party.animePoster || ''}
                title={`${party.animeTitle} - Episode ${party.episode}`}
                type="hls"
                malId={party.animeId}
                playerControlRef={playerControlRef}
                onPlay={() => {
                  if (isHost && socket && playerControlRef.current) {
                     socket.emit('sync-playback', { roomCode, isPlaying: true, currentTime: playerControlRef.current.getCurrentTime() });
                  }
                }}
                onPause={() => {
                  if (isHost && socket && playerControlRef.current) {
                     socket.emit('sync-playback', { roomCode, isPlaying: false, currentTime: playerControlRef.current.getCurrentTime() });
                  }
                }}
                onSeek={(time) => {
                  if (isHost && socket) {
                     socket.emit('sync-playback', { roomCode, isPlaying: true, currentTime: time });
                  }
                }}
              />
              
              {/* Floating Reactions */}
              <AnimatePresence>
                {reactions.map((reaction) => (
                  <motion.div
                    key={reaction.id}
                    initial={{ opacity: 1, y: 0, x: Math.random() * 200 - 100 }}
                    animate={{ opacity: 0, y: -200 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 3 }}
                    className="absolute bottom-20 left-1/2 text-6xl pointer-events-none"
                  >
                    {reaction.emoji}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Quick Reactions */}
            <div className="flex items-center gap-3 mt-4 mb-8">
              {['❤️', '😂', '😮', '👏', '🔥'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="text-3xl hover:scale-125 transition-transform drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* WebRTC Camera Network */}
            <div className="glass rounded-[2rem] p-6 border border-white/10 mt-6 shadow-2xl">
               <WebRTCNetwork socket={socket} roomCode={roomCode} isHost={isHost} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Members */}
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <Users size={20} className="text-neonCyan" />
                <h3 className="font-bold">Members ({party.members.length})</h3>
              </div>
              <div className="space-y-2">
                {party.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neonCyan to-pulsingViolet flex items-center justify-center text-xs font-bold">
                      {member.nickname[0].toUpperCase()}
                    </div>
                    <span className="text-sm flex-1">{member.nickname}</span>
                    {member.user.id === party.host.id && (
                      <Crown size={14} className="text-yellow-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Chat */}
            <div className="glass rounded-2xl p-4 h-96 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle size={20} className="text-neonCyan" />
                <h3 className="font-bold">Chat</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2 mb-4 custom-scrollbar">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`text-sm ${msg.type === 'system' ? 'text-white/40 italic text-center' : ''}`}>
                    {msg.type !== 'system' && (
                      <span className="font-bold text-neonCyan">{msg.username}: </span>
                    )}
                    <span>{msg.message}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm outline-none focus:border-neonCyan transition-colors"
                />
                <button
                  onClick={sendMessage}
                  className="px-4 py-2 bg-neonCyan text-black rounded-lg font-bold hover:bg-white transition-all"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
