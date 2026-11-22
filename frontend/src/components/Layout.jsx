import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";

export const Layout = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export const Page = ({ children, testid, narrow }) => (
  <div className={`mx-auto px-5 pt-10 md:px-8 md:pt-14 ${narrow ? "max-w-3xl" : "max-w-6xl"}`} data-testid={testid}>
    {children}
  </div>
);
