"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type KeyboardEvent } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import branding from "../../../branding.json";
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
// A native image preserves the exact supplied SVG and supports future owner-hosted logo URLs without a remote optimizer allowlist.
// eslint-disable-next-line @next/next/no-img-element
export function Brand() { return <Link href="/" className="brand" aria-label={`${branding.logoText}, Inicio`}><img data-brand-logo src={branding.logoImageUrl || "/brand-mark.svg"} width="32" height="32" alt=""/><span>{branding.logoText}</span></Link>; }
export function Header() {
  const path = usePathname(); const [open, setOpen] = useState(false);
  const links = [{ href: "/", text: "Inicio" }, { href: "/catalogo", text: "Catálogo" }, { href: "/pedido", text: "Mi pedido" }];
  function contain(event: KeyboardEvent<HTMLElement>) { if (event.key !== "Tab") return; const nodes = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')).filter(n => n.getClientRects().length); const first = nodes[0], last = nodes[nodes.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } }
  return <header className="site-header"><Brand/><nav className="desktop-nav" aria-label="Navegación principal">{links.map(l => <Link key={l.href} href={l.href} aria-current={path === l.href ? "page" : undefined}>{l.text}</Link>)}</nav><span className="header-location">Flores de ejemplo · Medellín</span><div className="mobile-menu"><Sheet open={open} onOpenChange={setOpen}><SheetTrigger className="icon-button" aria-label="Abrir menú"><Menu size={22}/></SheetTrigger><SheetContent className="petalo-sheet" showCloseButton={false} onKeyDown={contain}><SheetTitle>Explora Pétalo Norte</SheetTitle><SheetDescription>Flores para elegir con claridad.</SheetDescription><SheetClose className="icon-button menu-close" aria-label="Cerrar menú"><X/></SheetClose><nav aria-label="Navegación móvil">{links.map(l => <Link key={l.href} href={l.href} onClick={() => setOpen(false)} aria-current={path === l.href ? "page" : undefined}>{l.text}<ArrowUpRight size={20}/></Link>)}<Link href="/duena/acceso" onClick={() => setOpen(false)}>Acceso de la dueña</Link></nav></SheetContent></Sheet></div></header>;
}
export function Footer() { return <footer className="site-footer"><div className="footer-main"><Brand/><p>Una mesa, tres maneras<br/>de elegir flores.</p><Link href="/duena/acceso">Acceso de la dueña <ArrowUpRight size={16}/></Link></div><p className="demo-notice">Negocio ficticio: arreglos, imágenes, precios y condiciones de ejemplo.</p></footer>; }
