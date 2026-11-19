import type { MetadataRoute } from "next";
import branding from "../../branding.json";
export default function manifest(): MetadataRoute.Manifest { return { name: branding.logoText, short_name: branding.logoText, lang: "es", start_url: "/", display: "standalone", background_color: branding.backgroundColor, theme_color: branding.primaryColor, icons: [{ src: "/brand-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }, { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "any" }] }; }
