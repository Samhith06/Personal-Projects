import { siInstagram, siTelegram, siX, siYoutube, type SimpleIcon } from 'simple-icons';

export type Social = { name: string; handle: string; href: string; icon: SimpleIcon };

/** Steezy's public social accounts, shown in the About section and the footer. */
export const SOCIALS: Social[] = [
  { name: 'Instagram', handle: '@steezyspinss', href: 'https://www.instagram.com/steezyspinss', icon: siInstagram },
  { name: 'X', handle: '@SteezySpins', href: 'https://x.com/SteezySpins', icon: siX },
  { name: 'YouTube', handle: 'SteezySpins channel', href: 'https://www.youtube.com/channel/UC-UfDqtn_oeMubitsrGl1uw', icon: siYoutube },
  { name: 'Telegram', handle: 'SteezySpins group', href: 'https://t.me/+MWz7WFJ0TKQ5MjZk', icon: siTelegram },
];
