import { PageTitle } from '@/components/admin/fields';
import { FeaturedForm } from '@/components/admin/AdminForms';
import { dateLabel, usd } from '@/lib/format';
import {
  getAnnouncements,
  getChallenges,
  getClips,
  getRaffles,
  getSiteSettings,
  getWins,
  parseIdList,
} from '@/server/services/content';
import { masterContext } from '../_lib';

export const metadata = { title: 'Homepage' };

export default async function AdminHomepage() {
  const ctx = await masterContext();
  const [settings, clips, wins, raffles, challenges, announcements] = await Promise.all([
    getSiteSettings(),
    getClips({ limit: 200 }),
    getWins({ limit: 200 }),
    getRaffles(),
    getChallenges(),
    getAnnouncements(50),
  ]);

  return (
    <>
      <PageTitle
        eyebrow="Site"
        title="Homepage"
        description="The homepage only shows what you pick here — nothing is added automatically."
      />
      <FeaturedForm
        settings={{
          ...settings,
          featuredClipIds: parseIdList(settings.featuredClipIds),
          featuredWinIds: parseIdList(settings.featuredWinIds),
        }}
        clips={clips.map((c) => ({
          id: c.id,
          label: c.title,
          meta: `${ctx.names.get(c.streamerId) ?? c.streamerId} · ${c.platform} · ${dateLabel(c.publishedAt, 'UTC')}`,
        }))}
        wins={wins.map((w) => ({
          id: w.id,
          label: `${usd(w.payout)} — ${w.game}`,
          meta: `${ctx.names.get(w.streamerId) ?? w.streamerId} · ${w.kind}`,
        }))}
        raffles={raffles.map((r) => ({ id: r.id, label: r.name, meta: r.status }))}
        challenges={challenges.map((c) => ({ id: c.id, label: c.name, meta: c.status }))}
        announcements={announcements.map((a) => ({ id: a.id, label: a.title, meta: dateLabel(a.publishedAt, 'UTC') }))}
        streamers={ctx.streamers.map((s) => ({ id: s.id, label: s.displayName }))}
      />
    </>
  );
}
