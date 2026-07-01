import { Platform } from 'react-native';
import api from './api';
import { getCookie } from './api';
import { ENV } from '../config/env';
import { ApiResponse } from '../types';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiCoachChatResult {
  reply: string;
}

/**
 * Non-streaming fallback — use only when streaming is unavailable.
 */
export const sendAiCoachMessage = async (
  message: string,
  history: ChatMessage[] = [],
): Promise<string> => {
  const res = await api.post<ApiResponse<AiCoachChatResult>>(
    '/member/ai-coach/chat',
    { message, history },
    { timeout: 45000 },
  );
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.message ?? 'AI Coach failed to respond');
  }
  return res.data.data.reply;
};

/**
 * Streaming AI Coach message.
 * Calls `onChunk(token)` for every text fragment received.
 * Resolves when the stream ends, rejects on error.
 *
 * Uses the native Fetch API (not axios) to support ReadableStream.
 * Auth is handled via httpOnly cookie (web) or manual Cookie header (native).
 */
export const streamAiCoachMessage = async (
  message: string,
  history: ChatMessage[],
  onChunk: (token: string) => void,
  signal?: AbortSignal,
): Promise<void> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Browsers handle auth via httpOnly cookie + credentials:'include'.
  // Native (Android/iOS) must attach the cookie manually.
  if (Platform.OS !== 'web') {
    const cookie = await getCookie();
    if (cookie) headers['Cookie'] = cookie;
  }

  const response = await fetch(`${ENV.API_BASE}/member/ai-coach/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, history }),
    credentials: Platform.OS === 'web' ? 'include' : 'same-origin',
    signal,
  });

  if (!response.ok) {
    throw new Error(`AI Coach stream failed (${response.status})`);
  }

  if (!response.body) {
    throw new Error('Streaming not supported in this environment');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.t) onChunk(parsed.t);
        } catch (e) {
          if ((e as Error).message.includes('Unexpected token')) continue; // malformed chunk
          throw e;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
};
