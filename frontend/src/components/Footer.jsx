import { Link } from "react-router-dom";
import { Logo } from "./Logo";

export const Footer = () => (
  <footer className="mt-24 border-t border-line" data-testid="site-footer">
    <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[2fr_1fr_1fr] md:px-8">
      <div className="space-y-4">
        <Logo />
        <p className="max-w-sm text-sm text-soft">Know where your audience is, then launch there. Interest labels are estimates from sampled public data, never claims about any platform's algorithm.</p>
      </div>
      <div className="space-y-3 text-sm">
        <p className="eyebrow">Product</p>
        <Link to="/app" className="block hover:underline" data-testid="footer-start-link">Start a run</Link>
        <Link to="/history" className="block hover:underline" data-testid="footer-history-link">History</Link>
        <Link to="/roadmap" className="block hover:underline" data-testid="footer-roadmap-link">Roadmap</Link>
      </div>
      <div className="space-y-3 text-sm">
        <p className="eyebrow">Learn</p>
        <a href="/#how" className="block hover:underline" data-testid="footer-how-link">How it works</a>
        <a href="/#pricing" className="block hover:underline" data-testid="footer-pricing-link">Pricing</a>
        <a href="/#faq" className="block hover:underline" data-testid="footer-faq-link">FAQ</a>
      </div>
    </div>
    <div className="mx-auto max-w-7xl px-5 pb-8 text-xs text-soft md:px-8">© {new Date().getFullYear()} Audience Radar. Demo mode: all results use bundled sample data.</div>
  </footer>
);
