import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiResponse } from 'next';

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

export function initSocket(server: NetServer) {
  if (!(server as any).io) {
    console.log('Initializing Socket.io...');
    const io = new SocketIOServer(server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Join watch party room
      socket.on('join-party', (roomCode: string) => {
        socket.join(roomCode);
        console.log(`Socket ${socket.id} joined party ${roomCode}`);
        socket.to(roomCode).emit('user-joined', { socketId: socket.id });
      });

      // Leave watch party room
      socket.on('leave-party', (roomCode: string) => {
        socket.leave(roomCode);
        console.log(`Socket ${socket.id} left party ${roomCode}`);
        socket.to(roomCode).emit('user-left', { socketId: socket.id });
      });

      // Sync playback state
      socket.on('sync-playback', (data: { roomCode: string; currentTime: number; isPlaying: boolean }) => {
        socket.to(data.roomCode).emit('playback-synced', {
          currentTime: data.currentTime,
          isPlaying: data.isPlaying
        });
      });

      // Chat message
      socket.on('send-message', (data: { roomCode: string; message: string; username: string; type?: string }) => {
        io.to(data.roomCode).emit('new-message', {
          message: data.message,
          username: data.username,
          type: data.type || 'text',
          timestamp: new Date().toISOString()
        });
      });

      // Emoji reaction
      socket.on('send-reaction', (data: { roomCode: string; emoji: string; username: string }) => {
        io.to(data.roomCode).emit('new-reaction', {
          emoji: data.emoji,
          username: data.username,
          timestamp: new Date().toISOString()
        });
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    (server as any).io = io;
  }
  return (server as any).io;
}
