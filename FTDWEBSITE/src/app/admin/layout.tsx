import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminNav, type NavGroup } from '@/components/admin/AdminNav';
import { Logo } from '@/components/brand/Logo';
import { hasLogoAsset } from '@/lib/brand';
import { discordAvatarUrl } from '@/server/auth/discord';
import { getStaff } from '@/server/auth/permissions';
import { getCurrentUser } from '@/server/auth/session';
import { getStreamer } from '@/server/services/content';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s · FGDR Admin' }, robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const staff = await getStaff();
  if (!staff) {
    const user = await getCurrentUser();
    redirect(user ? '/dashboard' : '/login?returnTo=/admin');
  }

  const channel = staff.ownChannel ? await getStreamer(staff.ownChannel) : null;
  const { user } = staff;

  const groups: NavGroup[] = [
    { label: 'Overview', items: [{ href: '/admin', label: 'Dashboard', icon: 'dashboard' }] },
    {
      label: staff.isMaster ? 'Channels' : 'My channel',
      items: [
        { href: '/admin/profile', label: staff.isMaster ? 'Creator profiles' : 'Profile', icon: 'user' },
        { href: '/admin/clips', label: 'Clips', icon: 'film' },
        { href: '/admin/wins', label: 'Wall of Fame', icon: 'crown' },
        { href: '/admin/raffles', label: 'Raffles', icon: 'ticket' },
        { href: '/admin/challenges', label: 'Challenges', icon: 'flag' },
        { href: '/admin/giveaways', label: 'Giveaways', icon: 'gift' },
        { href: '/admin/bonus-hunts', label: 'Bonus hunts', icon: 'spade' },
      ],
    },
  ];

  if (staff.isMaster) {
    groups.push({
      label: 'Site',
      items: [
        { href: '/admin/homepage', label: 'Homepage', icon: 'sparkle' },
        { href: '/admin/leaderboard', label: 'Leaderboard', icon: 'chart' },
        { href: '/admin/stake-users', label: 'Stake users', icon: 'spade' },
        { href: '/admin/rewards', label: 'VIP rewards', icon: 'trophy' },
        { href: '/admin/announcements', label: 'Announcements', icon: 'megaphone' },
        { href: '/admin/community', label: 'Community', icon: 'signal' },
        { href: '/admin/members', label: 'Members', icon: 'users' },
      ],
    });
  }

  return (
    <div className="adm">
      <AdminNav
        brand={<Logo hasLogoAsset={hasLogoAsset} size={36} />}
        groups={groups}
        identity={
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={discordAvatarUrl(user.discordId, user.discordAvatar, 64)} alt="" width={36} height={36} />
            <span>
              <b>{user.discordGlobalName || user.discordUsername}</b>
              <span className={`adm-role ${staff.isMaster ? 'adm-role--master' : ''}`}>
                {staff.isMaster ? 'Master admin' : `Creator${channel ? ` · ${channel.displayName}` : ''}`}
              </span>
            </span>
          </>
        }
      />
      <div className="adm-main">{children}</div>
    </div>
  );
}
