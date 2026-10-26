import { env, features, siteUrl } from '@/lib/env';
import { TELEGRAM_CALLBACK_PATH } from '@/server/auth/telegram';
import { LoginDialog } from './LoginDialog';

/** Every "Log in" button on the site: opens the Discord / Telegram picker. */
export function LoginButton({ label = 'Log in', returnTo }: { label?: string; returnTo?: string }) {
  return (
    <LoginDialog
      label={label}
      returnTo={returnTo}
      discord={features.discordAuth}
      telegram={features.telegramAuth ? { bot: env.telegramBotUsername!, callbackUrl: siteUrl(TELEGRAM_CALLBACK_PATH) } : null}
    />
  );
}
