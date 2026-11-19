import type { Metadata } from "next";
import { OwnerCataloguePage } from "@/components/petalo/owner";
export const metadata: Metadata = { title: "Disponibilidad del catálogo", robots: { index: false, follow: false } };
export default function Page() { return <OwnerCataloguePage/>; }
