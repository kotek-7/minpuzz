import { io, Socket } from 'socket.io-client';

let sock: Socket | null = null;

export function getSocket(): Socket {
  if (sock) return sock;
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  sock = io(url, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
  });
  return sock;
}

