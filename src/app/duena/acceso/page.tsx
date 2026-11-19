import type { Metadata } from "next";
import { OwnerAccessPage } from "@/components/petalo/owner";
export const metadata: Metadata = { title: "Acceso de la dueña", robots: { index: false, follow: false } };
export default function Page() { return <OwnerAccessPage/>; }
