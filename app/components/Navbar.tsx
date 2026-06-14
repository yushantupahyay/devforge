"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="navbar-bar">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="nav-logo-icon">&lt;/&gt;</span>
          <span className="text-gradient-purple font-bold text-sm tracking-tight">
            DevForge
          </span>
        </Link>

        {isHome && (
          <>
            <nav className="hidden md:flex items-center gap-1">
              <a href="#features" className="nav-link">Features</a>
              <a href="#tools" className="nav-link">Tools</a>
              <a href="#" className="nav-link">Roadmap</a>
            </nav>

            <a href="#tools" className="btn btn-primary btn-sm shrink-0">
              Open Tools ↗
            </a>
          </>
        )}
      </div>
    </header>
  );
}
