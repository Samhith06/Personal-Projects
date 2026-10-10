import Image from 'next/image';
import { Crest } from './Crest';

/**
 * The FGDR logo.
 *
 * The supplied artwork lives at `public/brand/fgdr-logo.png` and is rendered
 * untouched — no recolouring, cropping or re-proportioning. Until that file
 * is present, a matching crest is drawn so layouts never collapse.
 * `hasLogoAsset` is resolved once on the server (see `lib/brand.ts`).
 */
export function Logo({
  hasLogoAsset,
  size,
  priority = false,
  sweep = false,
  className = '',
}: {
  hasLogoAsset: boolean;
  size: number;
  priority?: boolean;
  sweep?: boolean;
  className?: string;
}) {
  return (
    <span className={`logo ${sweep ? 'logo--sweep' : ''} ${className}`} style={{ width: size, height: size }}>
      {hasLogoAsset ? (
        <Image
          src="/brand/fgdr-logo.png"
          alt=""
          width={size}
          height={size}
          priority={priority}
          sizes={`${size}px`}
          className="logo__img"
        />
      ) : (
        <Crest className="logo__img" />
      )}
      {sweep ? <span className="logo__sweep" aria-hidden="true" /> : null}
    </span>
  );
}
