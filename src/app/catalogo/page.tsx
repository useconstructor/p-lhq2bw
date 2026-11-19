import type { Metadata } from "next";
import { CataloguePage } from "@/components/petalo/catalogue";
export const metadata: Metadata = { title: "Catálogo de arreglos" };
export default function Page() { return <CataloguePage/>; }
