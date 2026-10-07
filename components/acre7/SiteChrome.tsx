"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/acre7/ThemeToggle";

const navItems = [
  { href: "/materials", label: "Materials" },
  { href: "/viewpoints", label: "Viewpoints" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return <header className="site-header">
    <Link className="site-brand" href="/" onClick={() => setOpen(false)} aria-label="Acre7 home">
      <Image className="site-brand-logo" src="/brand/acre7-wordmark.jpg" alt="" width={124} height={56} unoptimized />
    </Link>
    <nav className={open ? "site-nav is-open" : "site-nav"} aria-label="Primary navigation">
      {navItems.map((item) => {
        const active = pathname === item.href;
        return <Link key={item.href} href={item.href} className={active ? "site-nav-link active" : "site-nav-link"} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}>{item.label}</Link>;
      })}
      <Link className="site-nav-cta" href="/designer" onClick={() => setOpen(false)}>Open designer <ArrowUpRight size={15} /></Link>
    </nav>
    <div className="site-header-actions">
      <ThemeToggle />
      <button className="site-menu-toggle" type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>
    </div>
  </header>;
}

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="site-footer-brand"><Image className="site-footer-logo" src="/brand/acre7-wordmark.jpg" alt="Acre7" width={96} height={44} unoptimized /></div>
    <p>Floor plans into places you can enter.</p>
    <div className="site-footer-links"><Link href="/about">About</Link><Link href="/designer">Designer</Link><Link href="/materials">Materials</Link><Link href="/viewpoints">Viewpoints</Link></div>
    <span className="site-footer-note">© 2026 Acre7</span>
  </footer>;
}
