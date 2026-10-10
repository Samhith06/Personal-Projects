'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { saveFeatured, saveStreamer } from '@/server/actions/admin';

type Option = { id: string; label: string; meta?: string };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn--gold" type="submit" disabled={pending}>
      {pending ? 'Saving…' : label}
    </button>
  );
}

function Note({ state }: { state: { ok: boolean; message: string } | null }) {
  if (!state) return null;
  return (
    <p className={`form-note ${state.ok ? 'form-note--ok' : 'form-note--error'}`} role={state.ok ? 'status' : 'alert'}>
      {state.message}
    </p>
  );
}

function PickList({
  name,
  options,
  initial,
  max,
  legend,
}: {
  name: string;
  options: Option[];
  initial: string[];
  max: number;
  legend: string;
}) {
  const [selected, setSelected] = useState<string[]>(initial);
  return (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="field__label" style={{ marginBottom: '0.6rem' }}>
        {legend}{' '}
        <span className="muted">
          ({selected.length}/{max} — shown in the order you tick them)
        </span>
      </legend>
      <div className="admin-picks">
        {options.map((o) => {
          const checked = selected.includes(o.id);
          const order = selected.indexOf(o.id);
          return (
            <label key={o.id} className="admin-pick">
              <input
                type="checkbox"
                checked={checked}
                disabled={!checked && selected.length >= max}
                onChange={() =>
                  setSelected((prev) => (prev.includes(o.id) ? prev.filter((id) => id !== o.id) : [...prev, o.id]))
                }
              />
              <span>
                {checked ? <b className="gold-text">{order + 1}. </b> : null}
                {o.label}
                {o.meta ? <small>{o.meta}</small> : null}
              </span>
            </label>
          );
        })}
      </div>
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
    </fieldset>
  );
}

function Select({ name, label, options, value }: { name: string; label: string; options: Option[]; value: string | null }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={`admin-${name}`}>
        {label}
      </label>
      <select id={`admin-${name}`} className="select" name={name} defaultValue={value ?? ''}>
        <option value="">Automatic (soonest active)</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
            {o.meta ? ` — ${o.meta}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

function Text({ name, label, value, hint }: { name: string; label: string; value: string; hint?: string }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={`admin-${name}`}>
        {label}
      </label>
      <input id={`admin-${name}`} className="input" name={name} defaultValue={value} />
      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

export function FeaturedForm({
  settings,
  clips,
  wins,
  raffles,
  challenges,
  announcements,
  streamers,
}: {
  settings: {
    heroTitle: string;
    heroTagline: string;
    heroVideoUrl: string;
    featuredStreamerId: string | null;
    featuredChallengeId: string | null;
    featuredRaffleId: string | null;
    featuredAnnouncementId: string | null;
    featuredClipIds: string[];
    featuredWinIds: string[];
    discordUrl: string;
    xUrl: string;
    instagramUrl: string;
    youtubeUrl: string;
  };
  clips: Option[];
  wins: Option[];
  raffles: Option[];
  challenges: Option[];
  announcements: Option[];
  streamers: Option[];
}) {
  const [state, action] = useActionState(saveFeatured, null);

  return (
    <form action={action} className="admin-grid">
      <section className="panel admin-card">
        <h2 className="dash-card__title">Hero</h2>
        <Text name="heroTitle" label="Title" value={settings.heroTitle} />
        <Text name="heroTagline" label="Tagline" value={settings.heroTagline} />
        <Text
          name="heroVideoUrl"
          label="Background video URL"
          value={settings.heroVideoUrl}
          hint="Optimised renditions in /public/media are served first; this URL is the fallback source."
        />
      </section>

      <section className="panel admin-card">
        <h2 className="dash-card__title">Featured picks</h2>
        <Select name="featuredChallengeId" label="Featured challenge" options={challenges} value={settings.featuredChallengeId} />
        <Select name="featuredRaffleId" label="Featured raffle" options={raffles} value={settings.featuredRaffleId} />
        <Select name="featuredAnnouncementId" label="Featured announcement" options={announcements} value={settings.featuredAnnouncementId} />
        <Select name="featuredStreamerId" label="Featured streamer" options={streamers} value={settings.featuredStreamerId} />
      </section>

      <section className="panel admin-card admin-card--full">
        <h2 className="dash-card__title">Homepage clips</h2>
        <PickList name="featuredClipIds" options={clips} initial={settings.featuredClipIds} max={4} legend="Featured clips" />
      </section>

      <section className="panel admin-card admin-card--full">
        <h2 className="dash-card__title">Homepage Wall of Fame</h2>
        <PickList name="featuredWinIds" options={wins} initial={settings.featuredWinIds} max={3} legend="Featured wins" />
      </section>

      <section className="panel admin-card admin-card--full">
        <h2 className="dash-card__title">Community links</h2>
        <div className="grid-2">
          <Text name="discordUrl" label="Discord invite" value={settings.discordUrl} hint="Use # while a link isn’t ready." />
          <Text name="xUrl" label="X" value={settings.xUrl} />
          <Text name="instagramUrl" label="Instagram" value={settings.instagramUrl} />
          <Text name="youtubeUrl" label="YouTube" value={settings.youtubeUrl} />
        </div>
      </section>

      <div className="admin-card--full" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <Submit label="Publish homepage" />
        <Note state={state} />
      </div>
    </form>
  );
}

export function StreamerForm({
  streamer,
}: {
  streamer: {
    id: string;
    displayName: string;
    tagline: string;
    bio: string;
    chapterTitle: string;
    quote: string;
    specialty: string;
    biggestWinGame: string;
    portraitUrl: string | null;
    xUrl: string;
    instagramUrl: string;
    youtubeUrl: string;
  };
}) {
  const [state, action] = useActionState(saveStreamer, null);
  return (
    <form action={action} className="panel admin-card">
      <input type="hidden" name="id" value={streamer.id} />
      <h3 className="dash-card__title">{streamer.displayName}</h3>
      <Text name="tagline" label="Tagline" value={streamer.tagline} />
      <Text name="chapterTitle" label="Chapter title" value={streamer.chapterTitle} hint="Shown as “Chapter 01 — …” on the homepage." />
      <Text name="quote" label="Quote" value={streamer.quote} />
      <Text name="specialty" label="Specialty" value={streamer.specialty} />
      <Text name="biggestWinGame" label="Biggest win — game" value={streamer.biggestWinGame} />
      <Text name="portraitUrl" label="Portrait image URL" value={streamer.portraitUrl ?? ''} hint="Tall photo of the creator. Leave empty to use the generated portrait." />
      <div className="field">
        <label className="field__label" htmlFor={`bio-${streamer.id}`}>
          Bio
        </label>
        <textarea id={`bio-${streamer.id}`} className="input" name="bio" defaultValue={streamer.bio} rows={4} style={{ height: 'auto', paddingBlock: '0.8rem' }} />
      </div>
      <Text name="xUrl" label="X" value={streamer.xUrl} />
      <Text name="instagramUrl" label="Instagram" value={streamer.instagramUrl} />
      <Text name="youtubeUrl" label="YouTube" value={streamer.youtubeUrl} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Submit label="Save" />
        <Note state={state} />
      </div>
    </form>
  );
}
