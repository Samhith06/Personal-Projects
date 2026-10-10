import type { MetadataRoute } from 'next';
import { getStreamers } from '@/server/services/content';
import { CONTENT_NAV, LEGAL_NAV, PRIMARY_NAV, SECONDARY_NAV } from '@/lib/nav';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? 'http://localhost:3000';
  const streamers = await getStreamers();
  const paths = ['/', ...PRIMARY_NAV.map((n) => n.href), ...CONTENT_NAV.map((n) => n.href), ...SECONDARY_NAV.map((n) => n.href), ...LEGAL_NAV.map((n) => n.href), ...streamers.map((s) => `/streamers/${s.id}`)];
  return paths.map((p) => ({ url: `${base}${p}`, changeFrequency: p === '/' || p === '/live' ? 'hourly' : 'daily' }));
}
