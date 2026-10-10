import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { ChannelFilter } from '@/components/admin/ChannelFilter';
import { Empty, Field, FormGrid, PageTitle, Panel, Select } from '@/components/admin/fields';
import { ActionButton, AdminForm, DateTimeField } from '@/components/admin/kit';
import { Icon, PLATFORM_ICON, PLATFORM_LABEL } from '@/components/ui/Icon';
import { compact, dateLabel } from '@/lib/format';
import { db } from '@/server/db';
import { clips } from '@/server/db/schema';
import { deleteClip, saveClip } from '@/server/actions/staff';
import { adminContext, iso, param, resolveChannel } from '../_lib';

export const metadata = { title: 'Clips' };

const PLATFORM_OPTIONS = ['kick', 'youtube', 'instagram', 'tiktok', 'x', 'upload'].map((p) => ({ value: p, label: PLATFORM_LABEL[p] }));
const CATEGORY_OPTIONS = [
  { value: 'big-win', label: 'Big win' },
  { value: 'highlight', label: 'Highlight' },
  { value: 'funny', label: 'Funny' },
  { value: 'community', label: 'Community' },
];

export default async function AdminClips({ searchParams }: PageProps<'/admin/clips'>) {
  const ctx = await adminContext();
  const sp = await searchParams;
  const channel = resolveChannel(ctx, sp.channel);
  const editId = param(sp.edit);
  const creating = sp.new === '1';

  const list = await db
    .select()
    .from(clips)
    .where(channel ? eq(clips.streamerId, channel) : undefined)
    .orderBy(desc(clips.publishedAt));

  const editing = editId ? list.find((c) => c.id === editId) : undefined;
  const showForm = creating || Boolean(editing);
  const suffix = channel && ctx.staff.isMaster ? `channel=${channel}` : '';
  const listHref = `/admin/clips${suffix ? `?${suffix}` : ''}`;

  return (
    <>
      <PageTitle
        eyebrow={ctx.staff.isMaster ? 'Channels' : 'My channel'}
        title="Clips"
        description="Paste a clip link. YouTube and Instagram links play right on the site; others open on their platform."
        action={
          !showForm ? (
            <Link className="btn btn--gold btn--sm" href={`/admin/clips?new=1${suffix ? `&${suffix}` : ''}`} scroll={false}>
              <Icon name="film" /> Add clip
            </Link>
          ) : null
        }
      />

      {ctx.staff.isMaster ? <ChannelFilter basePath="/admin/clips" channels={ctx.streamers} active={channel} /> : null}

      {showForm ? (
        <Panel title={editing ? 'Edit clip' : 'Add clip'} action={<Link className="link-arrow" href={listHref} scroll={false}>Cancel</Link>}>
          <AdminForm action={saveClip} submitLabel={editing ? 'Save changes' : 'Publish clip'} doneHref={listHref} key={editing?.id ?? 'new'}>
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <FormGrid>
              <Select name="streamerId" label="Channel" value={editing?.streamerId ?? channel ?? ctx.channelOptions[0]?.value} options={ctx.channelOptions} disabled={!ctx.staff.isMaster} required />
              <Field name="title" label="Title" value={editing?.title} required />
              <Select name="platform" label="Platform" value={editing?.platform ?? 'kick'} options={PLATFORM_OPTIONS} required />
              <Select name="category" label="Category" value={editing?.category ?? 'highlight'} options={CATEGORY_OPTIONS} required />
              <Field name="url" label="Clip link" value={editing?.url} type="url" placeholder="https://…" hint="The page on Kick / YouTube / Instagram / TikTok / X." />
              <Field name="mediaUrl" label="Video file URL (optional)" value={editing?.mediaUrl} type="url" hint="A direct .mp4 link plays in FGDR's own player." />
              <Field name="thumbnailUrl" label="Thumbnail image (optional)" value={editing?.thumbnailUrl} type="url" />
              <Select name="orientation" label="Shape" value={editing?.orientation ?? 'landscape'} options={[{ value: 'landscape', label: 'Landscape (16:9)' }, { value: 'portrait', label: 'Vertical (Reels / Shorts)' }]} />
              <Field name="durationSec" label="Length (seconds)" value={editing?.durationSec} type="number" />
              <Field name="views" label="Views" value={editing?.views} type="number" />
              <DateTimeField name="publishedAt" label="Date" value={iso(editing?.publishedAt ?? new Date())} required />
            </FormGrid>
          </AdminForm>
        </Panel>
      ) : null}

      <Panel title={`${list.length} clips`}>
        {list.length ? (
          <div className="table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Clip</th>
                  {ctx.staff.isMaster ? <th>Channel</th> : null}
                  <th>Platform</th>
                  <th>Views</th>
                  <th>Date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className={c.id === editId ? 'is-editing' : ''}>
                    <td>
                      <b>{c.title}</b>
                      {c.isFeatured ? <span className="tag tag--gold adm-tag-inline">Homepage</span> : null}
                    </td>
                    {ctx.staff.isMaster ? <td>{ctx.names.get(c.streamerId)}</td> : null}
                    <td>
                      <span className="adm-platform">
                        <Icon name={PLATFORM_ICON[c.platform] ?? 'film'} />
                        {PLATFORM_LABEL[c.platform]}
                      </span>
                    </td>
                    <td className="tabular">{c.views ? compact(c.views) : '—'}</td>
                    <td>{dateLabel(c.publishedAt, 'UTC')}</td>
                    <td className="adm-table__actions">
                      <Link className="btn btn--ghost btn--sm" href={`/clips?play=${c.id}`} target="_blank">
                        View
                      </Link>
                      <Link className="btn btn--ghost btn--sm" href={`/admin/clips?edit=${c.id}${suffix ? `&${suffix}` : ''}`} scroll={false}>
                        Edit
                      </Link>
                      <ActionButton action={deleteClip} id={c.id} label="Delete" confirm="Confirm delete" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No clips yet.</Empty>
        )}
      </Panel>
    </>
  );
}
