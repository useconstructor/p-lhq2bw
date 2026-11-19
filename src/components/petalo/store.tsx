"use client";
import { createContext, useContext, useEffect, useState, type ReactNode, type Dispatch, type SetStateAction } from "react";
import { emptyDelivery, isArregloId, type DatosEntrega, type LineaEntrada, type Envio } from "@/lib/petalo-client";
export interface RecoveryEntry { key: string; operation?: Envio }
interface DraftStore { ready: boolean; lines: LineaEntrada[]; setLines: (lines: LineaEntrada[]) => void; delivery: DatosEntrega; setDelivery: Dispatch<SetStateAction<DatosEntrega>>; operation: Envio | null; setOperation: (value: Envio | null) => void; recoveries: RecoveryEntry[]; archiveOperation: (value: Envio) => void }
const Context = createContext<DraftStore | null>(null);
export function DraftProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false); const [lines, updateLines] = useState<LineaEntrada[]>([]); const [delivery, setDelivery] = useState<DatosEntrega>({ ...emptyDelivery }); const [operation, setOperation] = useState<Envio | null>(null); const [recoveries, setRecoveries] = useState<RecoveryEntry[]>([]);
  useEffect(() => { let active = true; queueMicrotask(() => { if (!active) return; try { const saved = JSON.parse(sessionStorage.getItem("petalo-selection") || "[]"); if (Array.isArray(saved) && saved.every(v => v && isArregloId(v.arregloId) && Number.isSafeInteger(v.cantidad) && v.cantidad > 0) && new Set(saved.map(v => v.arregloId)).size === saved.length) updateLines(saved.map(v => ({ arregloId: v.arregloId, cantidad: v.cantidad }))); } catch { /* A broken draft is not an order. */ } try { const keys = JSON.parse(sessionStorage.getItem("petalo-recovery-keys") || "[]"); if (Array.isArray(keys)) setRecoveries(keys.filter((key: unknown) => typeof key === "string" && /^[0-9a-f-]{36}$/i.test(key)).map((key: string) => ({ key }))); } catch {} setReady(true); }); return () => { active = false; }; }, []);
  function setLines(value: LineaEntrada[]) { updateLines(value); try { sessionStorage.setItem("petalo-selection", JSON.stringify(value)); } catch { /* Same-app in-memory transfer remains available. */ } }
  function archiveOperation(value: Envio) { const next = [...recoveries.filter(r => r.key !== value.clave), { key: value.clave, operation: value }]; setRecoveries(next); try { sessionStorage.setItem("petalo-recovery-keys", JSON.stringify(next.map(r => r.key))); } catch {} }
  return <Context.Provider value={{ ready, lines, setLines, delivery, setDelivery, operation, setOperation, recoveries, archiveOperation }}>{children}</Context.Provider>;
}
export function useDraft() { const value = useContext(Context); if (!value) throw Error("DraftProvider required"); return value; }
