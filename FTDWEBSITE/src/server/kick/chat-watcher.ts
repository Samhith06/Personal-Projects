/**
 * Reads the FGDR creators' Kick chats in real time, only while someone is
 * waiting on a verification code or a bonus hunt is taking slot calls or guesses.
 *
 * This uses Kick's public chat feed (the same one kick.com's own chat uses),
 * so it needs no credentials — but it is undocumented and needs a long-running
 * server. When Kick app credentials are configured, prefer the official
 * webhooks at /api/webhooks/kick; both paths call the same handler.
 */
import 'server-only';
import { db } from '@/server/db';
import { streamers } from '@/server/db/schema';
import { handleChatMessage, hasPendingVerifications } from './chat-verification';
import { handleHuntChat, hasHuntReadingChat, looksLikeHuntCommand } from './hunt-chat';

const PUSHER_URL = 'wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0-rc2&flash=false';
const IDLE_CHECK_MS = 60_000;

type WatcherState = {
  socket: WebSocket | null;
  rooms: Map<number, string>; // chatroom id -> channel slug
  retry: number;
  idleTimer: ReturnType<typeof setInterval> | null;
  starting: Promise<void> | null;
};

/** Anything left for the chat to tell us? */
async function needed() {
  const [codes, hunt] = await Promise.all([hasPendingVerifications(), hasHuntReadingChat()]);
  return codes || hunt;
}

const g = globalThis as unknown as { fgdrChatWatcher?: WatcherState };
const state: WatcherState = (g.fgdrChatWatcher ??= { socket: null, rooms: new Map(), retry: 0, idleTimer: null, starting: null });

async function resolveRooms() {
  const rows = await db.select({ slug: streamers.kickUsername }).from(streamers);
  const rooms = new Map<number, string>();
  await Promise.all(
    rows.map(async ({ slug }) => {
      try {
        const res = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`, {
          headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; FGDR-Verify/1.0)' },
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { chatroom?: { id?: number } };
        if (json.chatroom?.id) rooms.set(json.chatroom.id, slug);
      } catch (error) {
        console.error(`[kick-chat] could not resolve chatroom for ${slug}`, error);
      }
    }),
  );
  return rooms;
}

function connect() {
  const socket = new WebSocket(PUSHER_URL);
  state.socket = socket;

  socket.onmessage = async (event) => {
    let msg: { event: string; data?: string; channel?: string };
    try {
      msg = JSON.parse(String(event.data));
    } catch {
      return;
    }

    if (msg.event === 'pusher:connection_established') {
      state.retry = 0;
      for (const id of state.rooms.keys()) {
        socket.send(JSON.stringify({ event: 'pusher:subscribe', data: { auth: '', channel: `chatrooms.${id}.v2` } }));
      }
      console.info(`[kick-chat] watching ${state.rooms.size} FGDR chats for codes and hunt commands`);
      return;
    }

    if (msg.event === 'pusher:ping') {
      socket.send(JSON.stringify({ event: 'pusher:pong', data: {} }));
      return;
    }

    if (msg.event !== 'App\\Events\\ChatMessageEvent' || !msg.data) return;

    try {
      const data = JSON.parse(msg.data) as {
        content?: string;
        chatroom_id?: number;
        sender?: { id?: number; username?: string };
      };
      if (!data.content || !data.sender?.id || !data.sender.username) return;
      const isCode = data.content.toUpperCase().includes('FGDR-');
      const isHunt = looksLikeHuntCommand(data.content);
      if (!isCode && !isHunt) return;
      const message = {
        channel: state.rooms.get(data.chatroom_id ?? -1) ?? 'kick',
        senderId: String(data.sender.id),
        senderUsername: data.sender.username,
        content: data.content,
      };
      if (isCode) await handleChatMessage(message);
      if (isHunt) await handleHuntChat(message);
    } catch (error) {
      console.error('[kick-chat] failed to process message', error);
    }
  };

  socket.onclose = () => {
    if (state.socket !== socket) return;
    state.socket = null;
    // Reconnect with backoff only while someone is still waiting.
    needed()
      .then((pending) => {
        if (!pending) return stop();
        const delay = Math.min(30_000, 1000 * 2 ** state.retry++);
        setTimeout(() => {
          if (!state.socket) connect();
        }, delay);
      })
      .catch(() => undefined);
  };

  socket.onerror = () => socket.close();
}

function stop() {
  if (state.idleTimer) clearInterval(state.idleTimer);
  state.idleTimer = null;
  const socket = state.socket;
  state.socket = null;
  socket?.close();
  console.info('[kick-chat] no pending codes or hunts reading chat, stopped watching');
}

/** Start watching (no-op if already running). Safe to call on every code request or hunt save. */
export async function ensureChatWatcher() {
  if (process.env.KICK_CHAT_WATCHER === '0') return;
  if (state.socket || state.starting) return state.starting ?? undefined;

  state.starting = (async () => {
    state.rooms = await resolveRooms();
    if (!state.rooms.size) return;
    connect();
    state.idleTimer ??= setInterval(async () => {
      if (!(await needed().catch(() => true))) stop();
    }, IDLE_CHECK_MS);
  })().finally(() => {
    state.starting = null;
  });

  return state.starting;
}
