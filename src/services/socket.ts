import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import { getCookie } from './api';
import { ENV } from '../config/env';

const isWeb = Platform.OS === 'web';

let socket: Socket | null = null;

/**
 * Get (or create) the socket singleton.
 * Token is passed via `auth` because React Native cannot set Cookie headers
 * on WebSocket handshakes natively.
 */
export async function getSocket(): Promise<Socket> {
  if (socket && socket.connected) return socket;

  let token: string | null = null;
  if (!isWeb) {
    const cookieStr = await getCookie();
    if (cookieStr) {
      const match = cookieStr.match(/member_token=([^;]+)/);
      token = match ? match[1] : null;
    }
  }

  socket = io(ENV.API_URL, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    withCredentials: isWeb,
    auth: isWeb ? { role: 'MEMBER' } : { token, role: 'MEMBER' },
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return socket;
}

export async function connectSocket(): Promise<Socket> {
  const s = await getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
