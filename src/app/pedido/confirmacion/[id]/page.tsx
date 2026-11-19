import type { Metadata } from "next";
import { ConfirmationPage } from "@/components/petalo/confirmation";
export const metadata: Metadata = { title: "Pedido de demostración guardado", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ConfirmationPage key={id} id={id}/>; }
