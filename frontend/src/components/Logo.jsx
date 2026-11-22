import { Link } from "react-router-dom";

export const Logo = ({ compact = false }) => (
  <Link to="/" className="flex items-center gap-2.5 shrink-0" data-testid="header-logo-link" aria-label="Audience Radar home">
    <img src="/brand/mark-light.png" alt="" className="logo-light h-10 w-10" />
    <img src="/brand/mark-dark.png" alt="" className="logo-dark h-10 w-10" />
    {!compact && (
      <>
        <img src="/brand/word-light.png" alt="Audience Radar" className="logo-light h-[18px] w-auto" />
        <img src="/brand/word-dark.png" alt="Audience Radar" className="logo-dark h-[18px] w-auto" />
      </>
    )}
  </Link>
);
