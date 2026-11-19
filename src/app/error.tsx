"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main id="contenido" className="page-shell"><div className="page-title"><h1>No pudimos abrir esta página.</h1><p>Reintenta para recuperar el contenido.</p></div><div className="action-row"><button className="button" onClick={reset}>Reintentar</button><Link className="text-link" href="/">Inicio</Link></div></main>; }
