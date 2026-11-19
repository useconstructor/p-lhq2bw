import type { Metadata } from "next";
import { OrderPage } from "@/components/petalo/order";
export const metadata: Metadata = { title: "Configurar y revisar pedido" };
export default function Page() { return <OrderPage/>; }
