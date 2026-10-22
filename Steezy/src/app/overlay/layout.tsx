import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Overlay', robots: { index: false, follow: false } };

/** OBS browser sources: no site chrome, transparent page. */
export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{'html,body{background:transparent!important;overflow:hidden}'}</style>
      {children}
    </>
  );
}
