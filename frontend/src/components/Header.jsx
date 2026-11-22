import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTheme } from "next-themes";
import { Menu, Moon, Sun, X } from "lucide-react";
import { Show, UserButton, useAuth } from "@clerk/react";
import { Logo } from "./Logo";

const AUTH_NAV = [
  { to: "/sign-in", label: "Sign in", id: "sign-in" },
  { to: "/sign-up", label: "Sign up", id: "sign-up" },
];

const NAV = [
  { to: "/#how", label: "How it works", id: "how" },
  { to: "/#pricing", label: "Pricing", id: "pricing" },
  { to: "/roadmap", label: "Roadmap", id: "roadmap" },
  { to: "/history", label: "History", id: "history" },
];

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="btn-ghost !px-0 w-11"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      data-testid="theme-toggle-button"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

export const Header = () => {
  const [open, setOpen] = useState(false);
  const { isSignedIn } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ground/95 backdrop-blur" data-testid="site-header">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 md:px-8">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((n) => n.to.startsWith("/#") ? (
            <Link key={n.id} to={n.to} data-testid={`nav-${n.id}-link`} className="nav-link">{n.label}</Link>
          ) : (
            <NavLink key={n.id} to={n.to} data-testid={`nav-${n.id}-link`} className="nav-link">{n.label}</NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Show when="signed-out">
            <Link to="/sign-in" className="btn-ghost hidden xl:inline-flex" data-testid="header-sign-in-button">Sign in</Link>
            <Link to="/sign-up" className="btn-ghost hidden xl:inline-flex" data-testid="header-sign-up-button">Sign up</Link>
          </Show>
          <Link to="/app" className="btn-primary hidden sm:inline-flex" data-testid="header-start-run-button">Start a run</Link>
          <Show when="signed-in">
            <span className="flex h-11 w-11 items-center justify-center" data-testid="header-account-menu"><UserButton /></span>
          </Show>
          <button type="button" className="btn-ghost !px-0 w-11 xl:hidden" onClick={() => setOpen(!open)}
            aria-label="Toggle menu" aria-expanded={open} data-testid="mobile-menu-button">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-line px-5 py-3 xl:hidden" aria-label="Mobile" data-testid="mobile-menu">
          {[...NAV, { to: "/app", label: "Start a run", id: "start" }, ...(isSignedIn ? [] : AUTH_NAV)].map((n) => (
            <Link key={n.id} to={n.to} onClick={() => setOpen(false)} data-testid={`mobile-nav-${n.id}-link`}
              className="flex min-h-[44px] items-center rounded-xl px-3 font-medium transition-[background-color,transform] duration-200 hover:translate-x-1 hover:bg-surface">
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
};
