import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <span>© {new Date().getFullYear()} SteezeSpins · 18+ only · Gamble responsibly</span>
        <div className="site-footer__links">
          <Link href="/terms">Terms</Link>
          <Link href="/terms#privacy">Privacy</Link>
          <Link href="/terms#responsible-gambling">Responsible gambling</Link>
        </div>
      </div>
    </footer>
  );
}
