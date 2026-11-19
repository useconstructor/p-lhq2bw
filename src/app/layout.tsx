import type { Metadata } from "next";
import type { CSSProperties } from "react";
import branding from "../../branding.json";
import { fontAssets } from "@/data/font-assets";
import { DraftProvider } from "@/components/petalo/store";
import { Header, Footer } from "@/components/petalo/chrome";
import "./globals.css";
export const metadata: Metadata = { title: { default: `${branding.logoText} — Flores para elegir con claridad`, template: `%s · ${branding.logoText}` }, description: "Explora Brisa, Pulso y Claro. Elige tus arreglos y una entrega de demostración en Medellín.", icons: { icon: "/icon.svg", apple: "/apple-icon.png" }, manifest: "/manifest.webmanifest" };
const fontFaces = branding.brandbook.fontFaces.map(face => `@font-face{font-family:${JSON.stringify(face.family)};font-style:normal;font-weight:${face.weight};font-display:swap;src:url(${JSON.stringify(fontAssets[face.url] || face.url)});}`).join("\n");
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const apiOrigin = (process.env.NEXT_PUBLIC_CONSTRUCTOR_API || "https://constructor-api-git-dev-useconstructor.vercel.app").replace(/\/$/, ""); const project = process.env.NEXT_PUBLIC_PROJECT_ID || "P-LHQ2BW";
  return <html lang="es" style={{ "--brand-background": branding.backgroundColor, "--brand-surface": branding.secondaryColor, "--brand-primary": branding.primaryColor, "--brand-accent": branding.accentColor, "--brand-text": branding.textColor, "--brand-muted": branding.brandbook.colors.find(color => color.role === "muted")!.hex, "--brand-warning": "#875000", "--brand-font-heading": `'${branding.fontHeading}', sans-serif`, "--brand-font-body": `'${branding.fontBody}', sans-serif` } as CSSProperties}><head><style dangerouslySetInnerHTML={{ __html: fontFaces }}/></head><body><a className="skip-link" href="#contenido">Saltar al contenido</a><DraftProvider><Header/>{children}<Footer/></DraftProvider><script src={"https://constructor-api-git-dev-useconstructor.vercel.app/v1/projects/P-LHQ2BW/analytics/script.js"} defer></script><script src="/constructor-editor.js" defer/></body></html>;
}
