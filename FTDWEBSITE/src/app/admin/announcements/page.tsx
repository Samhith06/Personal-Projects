import Link from 'next/link';
import { Empty, Field, FormGrid, PageTitle, Panel, TextArea } from '@/components/admin/fields';
import { ActionButton, AdminForm, DateTimeField } from '@/components/admin/kit';
import { Icon } from '@/components/ui/Icon';
import { dateLabel } from '@/lib/format';
import { deleteAnnouncement, saveAnnouncement } from '@/server/actions/staff';
import { getAnnouncements } from '@/server/services/content';
import { iso, masterContext, param } from '../_lib';

export const metadata = { title: 'Announcements' };

export default async function AdminAnnouncements({ searchParams }: PageProps<'/admin/announcements'>) {
  await masterContext();
  const sp = await searchParams;
  const editId = param(sp.edit);
  const creating = sp.new === '1';

  const list = await getAnnouncements(50);
  const editing = editId ? list.find((a) => a.id === editId) : undefined;
  const showForm = creating || Boolean(editing);

  return (
    <>
      <PageTitle
        eyebrow="Site"
        title="Announcements"
        description="Community news. Pick which one appears on the homepage under Homepage → Featured picks."
        action={
          !showForm ? (
            <Link className="btn btn--gold btn--sm" href="/admin/announcements?new=1" scroll={false}>
              <Icon name="megaphone" /> New announcement
            </Link>
          ) : null
        }
      />

      {showForm ? (
        <Panel title={editing ? 'Edit announcement' : 'New announcement'} action={<Link className="link-arrow" href="/admin/announcements" scroll={false}>Cancel</Link>}>
          <AdminForm action={saveAnnouncement} submitLabel={editing ? 'Save changes' : 'Publish'} doneHref="/admin/announcements" key={editing?.id ?? 'new'}>
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <FormGrid>
              <Field name="kicker" label="Label" value={editing?.kicker ?? 'Announcement'} required placeholder="Special stream" />
              <Field name="title" label="Title" value={editing?.title} required placeholder="All four. One stream." />
              <TextArea name="body" label="Message" value={editing?.body} rows={4} required />
              <Field name="ctaLabel" label="Button text" value={editing?.ctaLabel} placeholder="See the rewards" />
              <Field name="ctaHref" label="Button link" value={editing?.ctaHref} type="url" placeholder="/rewards" />
              <DateTimeField name="publishedAt" label="Date" value={iso(editing?.publishedAt ?? new Date())} required />
            </FormGrid>
          </AdminForm>
        </Panel>
      ) : null}

      <Panel title={`${list.length} announcements`}>
        {list.length ? (
          <div className="table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Announcement</th>
                  <th>Date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} className={a.id === editId ? 'is-editing' : ''}>
                    <td>
                      <b>{a.title}</b>
                      {a.isFeatured ? <span className="tag tag--gold adm-tag-inline">Homepage</span> : null}
                      <br />
                      <span className="muted">{a.kicker}</span>
                    </td>
                    <td>{dateLabel(a.publishedAt, 'UTC')}</td>
                    <td className="adm-table__actions">
                      <Link className="btn btn--ghost btn--sm" href={`/admin/announcements?edit=${a.id}`} scroll={false}>
                        Edit
                      </Link>
                      <ActionButton action={deleteAnnouncement} id={a.id} label="Delete" confirm="Confirm delete" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No announcements yet.</Empty>
        )}
      </Panel>
    </>
  );
}
