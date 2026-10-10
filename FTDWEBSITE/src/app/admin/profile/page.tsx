import Link from 'next/link';
import { Field, FormGrid, PageTitle, Panel, Select, TextArea } from '@/components/admin/fields';
import { ImageField } from '@/components/admin/ImageField';
import { ActionButton, AdminForm } from '@/components/admin/kit';
import { Icon } from '@/components/ui/Icon';
import { Medallion } from '@/components/ui/primitives';
import { createStreamer, saveProfile, setStreamerActive } from '@/server/actions/staff';
import { adminContext, param } from '../_lib';

export const metadata = { title: 'Profile' };

const ACCENT_OPTIONS = [
  { value: 'gold', label: 'Gold' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'steel', label: 'Steel' },
  { value: 'ruby', label: 'Ruby (red)' },
];

export default async function AdminProfile({ searchParams }: PageProps<'/admin/profile'>) {
  const ctx = await adminContext();
  const { staff, streamers } = ctx;
  const sp = await searchParams;
  const requested = param(sp.channel);
  const creating = sp.new === '1';

  const editable = staff.isMaster ? streamers : streamers.filter((s) => s.id === staff.ownChannel);
  const current = editable.find((s) => s.id === requested) ?? editable.find((s) => s.id === staff.ownChannel) ?? editable[0];

  if (!current && !staff.isMaster) {
    return <PageTitle eyebrow="Profile" title="No channel assigned" description="Ask a master admin to link your account to a channel." />;
  }

  return (
    <>
      <PageTitle
        eyebrow={staff.isMaster ? 'Creator profiles' : 'My channel'}
        title={creating || !current ? 'Add a creator' : current.displayName}
        description="What fans see in The Crew section and on the profile page. Only the name and Kick handle are required — fill in the rest whenever you like."
        action={
          current && !creating ? (
            <Link className="btn btn--ghost btn--sm" href={`/streamers/${current.id}`} target="_blank">
              View profile <Icon name="external" />
            </Link>
          ) : null
        }
      />

      {staff.isMaster ? (
        <nav className="chips adm-filter" aria-label="Choose creator">
          {editable.map((s) => (
            <Link
              key={s.id}
              className="chip"
              href={`/admin/profile?channel=${s.id}`}
              aria-current={!creating && s.id === current?.id ? 'page' : undefined}
              scroll={false}
            >
              {s.displayName}
              {s.isActive ? '' : ' · hidden'}
            </Link>
          ))}
          <Link className="chip" href="/admin/profile?new=1" aria-current={creating ? 'page' : undefined} scroll={false}>
            + Add creator
          </Link>
        </nav>
      ) : null}

      {staff.isMaster && (creating || !current) ? (
        <Panel
          title="Add a creator"
          description="The URL slug is permanent — everything else can be changed afterwards."
          action={
            current ? (
              <Link className="link-arrow" href={`/admin/profile?channel=${current.id}`} scroll={false}>
                Cancel
              </Link>
            ) : null
          }
        >
          <AdminForm action={createStreamer} submitLabel="Add creator" resetOnSuccess>
            <FormGrid>
              <Field name="displayName" label="Display name" required placeholder="DaddyKong Gaming" />
              <Field
                name="kickUsername"
                label="Kick username"
                required
                placeholder="daddykonggaming"
                hint="Just the handle — kick.com/… is added for you."
              />
              <Field
                name="id"
                label="URL slug"
                required
                placeholder="daddykonggaming"
                hint="Lower-case letters, numbers and hyphens. This becomes /streamers/…"
              />
              <Field name="role" label="Role" placeholder="Slots · Giveaways" />
              <Select name="accent" label="Accent colour" value="gold" options={ACCENT_OPTIONS} />
            </FormGrid>
          </AdminForm>
        </Panel>
      ) : null}

      {current && !creating ? (
        <AdminForm action={saveProfile} submitLabel="Save profile" key={current.id}>
          <input type="hidden" name="streamerId" value={current.id} />

          <Panel title="Story" description="The headline shows as the gold quote on the homepage.">
            <div className="adm-profile-head">
              <Medallion monogram={current.monogram} imageUrl={current.avatarUrl} accent={current.accent} size="lg" />
              <div>
                <p className="adm-profile-head__name">{current.displayName}</p>
                <p className="muted">kick.com/{current.kickUsername}</p>
              </div>
            </div>
            <FormGrid>
              <Field name="displayName" label="Display name" value={current.displayName} required />
              <Field name="kickUsername" label="Kick username" value={current.kickUsername} required hint="Just the handle." />
              <Field name="role" label="Role" value={current.role} placeholder="Slots · Viewer picks" />
              <Select name="accent" label="Accent colour" value={current.accent} options={ACCENT_OPTIONS} />
              <Field name="tagline" label="Headline" value={current.tagline} hint="Short and punchy, emoji welcome." />
              <Field name="quote" label="Quote (homepage)" value={current.quote} />
              <TextArea name="bio" label="Bio" value={current.bio} rows={4} />
              <Field name="chapterTitle" label="Chapter title" value={current.chapterTitle} hint="Shown as “Chapter 01 — …”" />
              <Field name="specialty" label="Specialty" value={current.specialty} placeholder="High-limit slots & bonus hunts" />
              <Field
                name="biggestWin"
                label="Biggest win ($)"
                value={current.biggestWin || ''}
                type="number"
                hint="Leave empty if there isn't one yet."
              />
              <Field name="biggestWinGame" label="Biggest win — game" value={current.biggestWinGame} />
            </FormGrid>
          </Panel>

          <Panel
            title="Channel numbers"
            description="All optional — anything left empty is simply not shown on the site, rather than displayed as a zero."
          >
            <FormGrid>
              <Field name="followers" label="Kick followers" value={current.followers || ''} type="number" />
              <Field name="avgViewers" label="Average viewers" value={current.avgViewers || ''} type="number" />
              <Field name="peakViewers" label="Peak viewers" value={current.peakViewers || ''} type="number" />
              <Field name="streamsThisMonth" label="Streams this month" value={current.streamsThisMonth || ''} type="number" />
              <Field name="allTimeWager" label="Community wager ($)" value={current.allTimeWager || ''} type="number" inputMode="decimal" />
              <Field name="rafflesHosted" label="Raffles hosted" value={current.rafflesHosted || ''} type="number" />
            </FormGrid>
          </Panel>

          <Panel title="Images" description="Upload a file or paste an https:// link. Leave empty to use the generated artwork.">
            <FormGrid>
              <ImageField
                name="avatarUrl"
                label="Avatar (square)"
                value={current.avatarUrl}
                hint="If empty, the Kick profile picture is used where available."
              />
              <ImageField name="portraitUrl" label="Portrait (tall photo)" value={current.portraitUrl} />
              <ImageField name="bannerUrl" label="Banner (wide)" value={current.bannerUrl} />
            </FormGrid>
          </Panel>

          <Panel title="Social links" description="Leave a link empty if it isn't ready yet.">
            <FormGrid>
              <Field name="xUrl" label="X" value={current.xUrl === '#' ? '' : current.xUrl} type="url" />
              <Field name="instagramUrl" label="Instagram" value={current.instagramUrl === '#' ? '' : current.instagramUrl} type="url" />
              <Field name="youtubeUrl" label="YouTube" value={current.youtubeUrl === '#' ? '' : current.youtubeUrl} type="url" />
              <Field name="tiktokUrl" label="TikTok" value={current.tiktokUrl === '#' ? '' : current.tiktokUrl} type="url" />
            </FormGrid>
          </Panel>
        </AdminForm>
      ) : null}

      {staff.isMaster && current && !creating ? (
        <Panel title="Visibility" description="Hiding a channel removes it from the site without deleting anything.">
          <ActionButton
            action={setStreamerActive}
            id={current.id}
            label={current.isActive ? 'Hide from the site' : 'Show on the site'}
            confirm={current.isActive ? 'Confirm hide' : 'Confirm show'}
            tone={current.isActive ? 'danger' : 'gold'}
          />
        </Panel>
      ) : null}
    </>
  );
}
