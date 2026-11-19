import type { Metadata } from "next";
import { ConfirmationPage } from "@/components/petalo/confirmation";
export const metadata: Metadata = { title: "Confirmación privada del pedido", robots: { index: false, follow: false } };
export default function Page() { return <ConfirmationPage/>; }
