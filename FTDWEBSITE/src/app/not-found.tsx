import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export default function NotFound() {
  return (
    <section className="not-found">
      <p className="eyebrow eyebrow--center">Bust</p>
      <p className="not-found__code gold-text">404</p>
      <h1 className="title-md display">This table is closed</h1>
      <p className="lede" style={{ marginInline: 'auto' }}>
        The page you were looking for doesn&apos;t exist or has moved.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link className="btn btn--gold" href="/">
          Back to FGDR
        </Link>
        <Link className="btn btn--ghost" href="/live">
          <Icon name="signal" />
          Who&apos;s live
        </Link>
      </div>
    </section>
  );
}
