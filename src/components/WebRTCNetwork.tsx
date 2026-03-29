'use client';

import { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, Maximize2 } from 'lucide-react';

interface PeerStream {
  id: string; // The socket id
  stream: MediaStream;
}

interface WebRTCNetworkProps {
  socket: Socket | null;
  roomCode: string;
  isHost: boolean;
}

export default function WebRTCNetwork({ socket, roomCode, isHost }: WebRTCNetworkProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerStream[]>([]);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [error, setError] = useState('');
  const userVideoRef = useRef<HTMLVideoElement>(null);
  
  // We keep track of simple-peer instances by socket ID
  const peersRef = useRef<{ [socketId: string]: Peer.Instance }>({});
  
  // Get User Media
  const enableMedia = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setStream(mediaStream);
      setHasVideo(true);
      setHasAudio(true);
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = mediaStream;
      }
      
      // Let existing users know we joined via media, simple-peer trick is they need to initiate
      // But standard protocol is: When a user joins the room socket.emit("join-party"), everyone gets "user-joined"
      // If we enable media AFTER joining, we need to broadcast a "ready" to trigger peer creation
    } catch (err: any) {
      setError('Camera/Mic permission denied or not available.');
      console.error(err);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => track.enabled = !hasVideo);
      setHasVideo(!hasVideo);
    }
  };

  const toggleAudio = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => track.enabled = !hasAudio);
      setHasAudio(!hasAudio);
    }
  };

  useEffect(() => {
    if (!socket || !stream) return;

    // When someone else joins the room, we (existing users) initiate a Peer offer to them
    const handleUserJoined = (data: { socketId: string }) => {
       console.log('User joined, initiating peer:', data.socketId);
       const peer = new Peer({
         initiator: true,
         trickle: false,
         stream: stream
       });

       peer.on('signal', (sdp) => {
         socket.emit('webrtc-offer', {
           target: data.socketId,
           caller: socket.id,
           sdp
         });
       });

       peer.on('stream', (userStream) => {
         setPeers(prev => {
            if (prev.find(p => p.id === data.socketId)) return prev;
            return [...prev, { id: data.socketId, stream: userStream }];
         });
       });

       peersRef.current[data.socketId] = peer;
    };

    // When we receive an offer from someone else
    const handleReceiveOffer = (data: { caller: string, sdp: any }) => {
       console.log('Received offer from:', data.caller);
       const peer = new Peer({
         initiator: false,
         trickle: false,
         stream: stream
       });

       peer.on('signal', (sdp) => {
         socket.emit('webrtc-answer', {
           target: data.caller,
           caller: socket.id,
           sdp
         });
       });

       peer.on('stream', (userStream) => {
         setPeers(prev => {
            if (prev.find(p => p.id === data.caller)) return prev;
            return [...prev, { id: data.caller, stream: userStream }];
         });
       });

       peer.signal(data.sdp);
       peersRef.current[data.caller] = peer;
    };

    // When we receive the answer to our offer
    const handleReceiveAnswer = (data: { caller: string, sdp: any }) => {
       console.log('Received answer from:', data.caller);
       const peer = peersRef.current[data.caller];
       if (peer) {
         peer.signal(data.sdp);
       }
    };

    const handleUserLeft = (data: { socketId: string }) => {
       if (peersRef.current[data.socketId]) {
         peersRef.current[data.socketId].destroy();
         delete peersRef.current[data.socketId];
       }
       setPeers(prev => prev.filter(p => p.id !== data.socketId));
    };

    socket.on('user-joined', handleUserJoined);
    socket.on('webrtc-offer', handleReceiveOffer);
    socket.on('webrtc-answer', handleReceiveAnswer);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.off('user-joined', handleUserJoined);
      socket.off('webrtc-offer', handleReceiveOffer);
      socket.off('webrtc-answer', handleReceiveAnswer);
      socket.off('user-left', handleUserLeft);
    };
  }, [socket, stream]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg flex items-center gap-2">
          🔴 Live Camera Network
        </h3>
        {!stream && (
          <button 
            onClick={enableMedia}
            className="px-4 py-2 bg-neonCyan text-black text-xs font-black uppercase tracking-widest rounded-lg hover:bg-white transition-all shadow-[0_0_15px_rgba(0,242,255,0.4)]"
          >
            Enable Camera
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-sm bg-red-500/10 p-2 rounded-lg">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
        {/* Local Stream */}
        {stream && (
          <div className="relative aspect-video glass rounded-2xl overflow-hidden group shadow-xl border border-neonCyan/30">
            <video 
              ref={userVideoRef} 
              autoPlay 
              muted 
              playsInline
              className="w-full h-full object-cover transform -scale-x-100" 
            />
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
               <span className="text-xs font-bold text-white shadow-md">You {isHost ? '(Host)' : ''}</span>
               <div className="flex gap-2">
                 <button onClick={toggleAudio} className={`p-1.5 rounded-full ${hasAudio ? 'bg-white/20' : 'bg-red-500/80'} text-white`}>
                   {hasAudio ? <Mic size={14} /> : <MicOff size={14} />}
                 </button>
                 <button onClick={toggleVideo} className={`p-1.5 rounded-full ${hasVideo ? 'bg-white/20' : 'bg-red-500/80'} text-white`}>
                   {hasVideo ? <Video size={14} /> : <VideoOff size={14} />}
                 </button>
               </div>
            </div>
            {/* Host Crown */}
            {isHost && (
              <div className="absolute top-2 right-2 bg-neonCyan text-black px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase">Host</div>
            )}
          </div>
        )}

        {/* Remote Streams */}
        <AnimatePresence>
          {peers.map(peer => (
            <motion.div 
              key={peer.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-xl border border-white/5 group"
            >
               <PeerVideo stream={peer.stream} />
               <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-bold text-white shadow-md">Party Member</span>
                  <button className="p-1.5 rounded-full bg-white/20 hover:bg-white text-white hover:text-black transition-colors">
                     <Maximize2 size={14} />
                  </button>
               </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Placeholder for empty seats */}
        {(!stream || peers.length + 1 < 8) && Array.from({ length: 8 - (stream ? 1 : 0) - peers.length }).slice(0, 3).map((_, i) => (
           <div key={`empty-${i}`} className="aspect-video glass rounded-2xl border border-white/5 border-dashed flex flex-col items-center justify-center text-white/20">
             <Video size={24} className="mb-2" />
             <span className="text-[10px] font-bold uppercase tracking-widest">Empty Seat</span>
           </div>
        ))}
      </div>
    </div>
  );
}

function PeerVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);
  return <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />;
}
