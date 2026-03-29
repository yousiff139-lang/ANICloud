import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function SocketHandler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.io server...');
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join-party', (roomCode: string) => {
        socket.join(roomCode);
        console.log(`Socket ${socket.id} joined party ${roomCode}`);
        
        // Notify others that a new user joined so they can initiate WebRTC peer connections
        socket.to(roomCode).emit('user-joined', { socketId: socket.id });
      });

      socket.on('leave-party', (roomCode: string) => {
        socket.leave(roomCode);
        socket.to(roomCode).emit('user-left', { socketId: socket.id });
      });

      // Playback Sync
      socket.on('sync-playback', (data: { roomCode: string; currentTime: number; isPlaying: boolean }) => {
        socket.to(data.roomCode).emit('playback-synced', {
          currentTime: data.currentTime,
          isPlaying: data.isPlaying
        });
      });

      // Chat Messages
      socket.on('send-message', (data: { roomCode: string; message: string; username: string; type?: string }) => {
        io.to(data.roomCode).emit('new-message', {
          message: data.message,
          username: data.username,
          type: data.type || 'text',
          timestamp: new Date().toISOString()
        });
      });

      // Emojis
      socket.on('send-reaction', (data: { roomCode: string; emoji: string; username: string }) => {
        io.to(data.roomCode).emit('new-reaction', {
          emoji: data.emoji,
          username: data.username,
          timestamp: new Date().toISOString()
        });
      });

      // WebRTC Signaling
      socket.on('webrtc-offer', (data: { target: string; caller: string; sdp: any; username: string }) => {
        socket.to(data.target).emit('webrtc-offer', {
          caller: data.caller,
          sdp: data.sdp,
          username: data.username
        });
      });

      socket.on('webrtc-answer', (data: { target: string; caller: string; sdp: any }) => {
        socket.to(data.target).emit('webrtc-answer', {
          caller: data.caller,
          sdp: data.sdp
        });
      });

      socket.on('webrtc-ice-candidate', (data: { target: string; candidate: any; caller: string }) => {
        socket.to(data.target).emit('webrtc-ice-candidate', {
          candidate: data.candidate,
          caller: data.caller
        });
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // We broadcast to all rooms they were in
        // socket.rooms is already empty here, but we can emit a global message if we tracked it
      });
    });

    res.socket.server.io = io;
  }
  
  res.end();
}
