import { createPublicKey, verify } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { handleChatEvent } from '@/server/kick/chat';
import { applyLiveEvent } from '@/server/kick/sessions';

/**
 * Kick's official event webhooks (signature check from FTDWEBSITE).
 *
 * Subscribe Steezy's channel with `npm run kick:subscribe` (chat.message.sent
 * and livestream.status.updated). Every delivery is verified against Kick's
 * published public key before anything is trusted.
 */

let publicKey: { pem: string; at: number } | null = null;

async function kickPublicKey() {
  if (publicKey && Date.now() - publicKey.at < 6 * 60 * 60 * 1000) return publicKey.pem;
  const res = await fetch('https://api.kick.com/public/v1/public-key', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Kick public key fetch failed (${res.status})`);
  const json = (await res.json()) as { data?: { public_key?: string } };
  if (!json.data?.public_key) throw new Error('Kick public key missing');
  publicKey = { pem: json.data.public_key, at: Date.now() };
  return publicKey.pem;
}

type Broadcaster = { user_id?: number; username?: string; channel_slug?: string };

/** When KICK_CHANNEL_SLUG is set, events from any other channel are ignored. */
function isOurChannel(b: Broadcaster | undefined) {
  const slug = process.env.KICK_CHANNEL_SLUG?.trim().toLowerCase();
  if (!slug) return true;
  return (b?.channel_slug ?? b?.username ?? '').toLowerCase() === slug;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const messageId = request.headers.get('kick-event-message-id');
  const timestamp = request.headers.get('kick-event-message-timestamp');
  const signature = request.headers.get('kick-event-signature');
  const type = request.headers.get('kick-event-type');

  if (!messageId || !timestamp || !signature) return new NextResponse('Missing signature', { status: 400 });

  try {
    const ok = verify(
      'RSA-SHA256',
      Buffer.from(`${messageId}.${timestamp}.${body}`),
      createPublicKey(await kickPublicKey()),
      Buffer.from(signature, 'base64'),
    );
    if (!ok) return new NextResponse('Invalid signature', { status: 401 });
  } catch (error) {
    console.error('[kick-webhook] signature check failed', error);
    return new NextResponse('Signature check failed', { status: 401 });
  }

  try {
    if (type === 'chat.message.sent') {
      const e = JSON.parse(body) as {
        message_id?: string;
        content?: string;
        created_at?: string;
        broadcaster?: Broadcaster;
        sender?: { user_id?: number; username?: string };
      };
      if (isOurChannel(e.broadcaster) && e.content && e.sender?.user_id && e.sender.username && e.broadcaster?.user_id) {
        await handleChatEvent(
          {
            messageId: e.message_id ?? messageId,
            senderId: String(e.sender.user_id),
            senderUsername: e.sender.username,
            content: e.content,
            at: new Date(e.created_at ?? timestamp),
          },
          String(e.broadcaster.user_id),
        );
      }
    } else if (type === 'livestream.status.updated') {
      const e = JSON.parse(body) as {
        broadcaster?: Broadcaster;
        is_live?: boolean;
        title?: string;
        started_at?: string;
        ended_at?: string | null;
      };
      if (isOurChannel(e.broadcaster)) {
        const result = await applyLiveEvent({
          isLive: Boolean(e.is_live),
          title: e.title ?? null,
          startedAt: e.started_at ? new Date(e.started_at) : null,
          endedAt: e.ended_at ? new Date(e.ended_at) : null,
        });
        console.info(`[kick-webhook] livestream ${e.is_live ? 'live' : 'offline'} → ${result}`);
      }
    }
  } catch (error) {
    // 500 makes Kick retry; chat messages are de-duplicated on message id, live events are idempotent.
    console.error(`[kick-webhook] ${type} handling failed`, error);
    return new NextResponse('Handler failed', { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
