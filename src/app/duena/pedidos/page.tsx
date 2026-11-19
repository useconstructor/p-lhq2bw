import type { Metadata } from "next";
import { OwnerOrdersPage } from "@/components/petalo/owner";
export const metadata: Metadata = { title: "Entregas de demostración", robots: { index: false, follow: false } };
export default function Page() { return <OwnerOrdersPage/>; }
