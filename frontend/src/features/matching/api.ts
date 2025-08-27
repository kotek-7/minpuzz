import { getSocket } from '@/lib/socket/client';
import { SOCKET_EVENTS } from '@/lib/socket/events';

export async function startMatching(teamId: string, userId: string): Promise<void> {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  // REST: マッチング開始要求
  const res = await fetch(`${base}/v1/teams/${teamId}/startMatching`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const msg = await safeError(res);
    throw new Error(msg || 'マッチング開始に失敗しました');
  }
  // Socket: マッチング待機キューに参加
  const s = getSocket();
  s.emit(SOCKET_EVENTS.JOIN_MATCHING_QUEUE, { teamId, userId });
}

async function safeError(res: Response): Promise<string | null> {
  try {
    const data = await res.json();
    if (data?.message) return data.message as string;
  } catch {}
  return null;
}

