'use client';

import { useEffect, useRef } from 'react';

/**
 * Telegram's login widget. Its script draws the button where the script tag
 * sits, so it's added by hand after mount rather than rendered by React (which
 * would hoist it into <head>). Telegram sends the member to `authUrl` with the
 * signed profile appended.
 */
export function TelegramLogin({ bot, authUrl }: { bot: string; authUrl: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.dataset.telegramLogin = bot;
    script.dataset.size = 'large';
    script.dataset.radius = '8';
    script.dataset.authUrl = authUrl;
    el.replaceChildren(script);
    return () => el.replaceChildren();
  }, [bot, authUrl]);

  return <div ref={ref} style={{ minHeight: 40 }} />;
}
