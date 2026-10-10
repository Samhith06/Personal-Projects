import { createPublicKey, verify } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { handleChatMessage } from '@/server/kick/chat-verification';
import { handleHuntChat } from '@/server/kick/hunt-chat';

/**
 * Kick's official event webhooks (production path for chat-code verification
 * and bonus hunt slot calls and guesses).
 *
 * Subscribe each creator channel to `chat.message.sent` with this URL as
 * the webhook target (see README). Every delivery is signature-checked
 * against Kick's published public key before anything is trusted.
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

export async function POST(request: NextRequest) {
  const body = await request.text();
  const messageId = request.headers.get('kick-event-message-id');
  const timestamp = request.headers.get('kick-event-message-timestamp');
  const signature = request.headers.get('kick-event-signature');
  const type = request.headers.get('kick-event-type');

  if (!messageId || !timestamp || !signature) return new NextResponse('Missing signature', { status: 400 });

  try {
    const pem = await kickPublicKey();
    const ok = verify(
      'RSA-SHA256',
      Buffer.from(`${messageId}.${timestamp}.${body}`),
      createPublicKey(pem),
      Buffer.from(signature, 'base64'),
    );
    if (!ok) return new NextResponse('Invalid signature', { status: 401 });
  } catch (error) {
    console.error('[kick-webhook] signature check failed', error);
    return new NextResponse('Signature check failed', { status: 401 });
  }

  if (type === 'chat.message.sent') {
    const event = JSON.parse(body) as {
      content?: string;
      sender?: { user_id?: number; username?: string };
      broadcaster?: { channel_slug?: string; username?: string };
    };
    if (event.content && event.sender?.user_id && event.sender.username) {
      const message = {
        channel: event.broadcaster?.channel_slug ?? event.broadcaster?.username ?? 'kick',
        senderId: String(event.sender.user_id),
        senderUsername: event.sender.username,
        content: event.content,
      };
      await handleChatMessage(message);
      await handleHuntChat(message);
    }
  }

  return NextResponse.json({ ok: true });
}
