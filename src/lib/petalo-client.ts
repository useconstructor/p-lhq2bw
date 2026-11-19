"use client";

export type ArregloId = "brisa" | "pulso" | "claro";
export type FranjaId = "manana" | "tarde";
export type Estado = "recibido" | "en_preparacion" | "en_camino" | "entregado";
export interface Arreglo { id: ArregloId; nombre: string; descripcion: string; precio: number; stock: number; activo: boolean; revision: number; vectorVersion: string; rendererVersion: string }
export interface LineaEntrada { arregloId: ArregloId; cantidad: number }
export interface DatosEntrega { fecha: string; franja: FranjaId | ""; compradorNombre: string; compradorTelefono: string; destinatarioNombre: string; destinatarioTelefono: string; direccion: string; barrio: string; referencias: string; dedicatoria: string }
export interface Borrador { lineas: LineaEntrada[]; entrega: DatosEntrega }
export interface LineaCongelada { arregloId: ArregloId; nombre: string; descripcion: string; cantidad: number; precioUnitario: number; totalLinea: number; catalogoRevision: number; vectorVersion: string; rendererVersion: string }
export interface Cotizacion { lineas: LineaCongelada[]; subtotal: number; domicilio: number; total: number }
export interface Revision { borrador: Borrador; cotizacion: Cotizacion }
export interface Envio { clave: string; borrador: Borrador; cotizacion: Cotizacion }
export interface Pedido extends Cotizacion { id: string; creadoEn: string; estado: Estado; entrega: DatosEntrega; historial: { estado: Estado; creadoEn: string }[] }
export interface Disponibilidad { hoy: string; fechaMin: string; fechaMax: string; fecha: string; ahora: string; franjas: { id: FranjaId; inicio: string; fin: string; capacidad: number; ocupados: number; disponibles: number; estado: "disponible" | "completa" | "pasada" }[] }
export interface ErrorInfo { code: string; message: string; fields?: Record<string, string>; local?: unknown; current?: unknown; retryAt?: string }
export class PetaloError extends Error { status: number; info: ErrorInfo; constructor(status: number, info: ErrorInfo) { super(info.message); this.status = status; this.info = info; } }
export async function api<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try { response = await fetch(path, { method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store", headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal }); }
  catch (error) { if (signal?.aborted) throw error; throw new PetaloError(0, { code: "RED", message: "No pudimos conectar. Tus datos siguen aquí; vuelve a intentarlo." }); }
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ok === false) throw new PetaloError(response.status, typeof data?.error === "object" ? data.error : { code: "FALLO", message: typeof data?.error === "string" ? data.error : "No pudimos completar la consulta. Vuelve a intentarlo." });
  if (!data) throw new PetaloError(0, { code: "RESPUESTA", message: "No pudimos verificar la respuesta. Vuelve a consultar." });
  return data.ok === true ? data.data : data;
}
export const money = (value: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value) + " COP";
export const names: Record<ArregloId, string> = { brisa: "Brisa", pulso: "Pulso", claro: "Claro" };
export const statusNames: Record<Estado, string> = { recibido: "Recibido", en_preparacion: "En preparación", en_camino: "En camino", entregado: "Entregado" };
export const slotNames: Record<FranjaId, string> = { manana: "09:00–12:00", tarde: "14:00–18:00" };
export function isArregloId(value: string): value is ArregloId { return ["brisa", "pulso", "claro"].includes(value); }
export function quantity(value: string): number | null { if (!/^\d+$/.test(value.trim())) return null; const n = Number(value); return Number.isSafeInteger(n) && n > 0 ? n : null; }
export function errorInfo(error: unknown): ErrorInfo { return error instanceof PetaloError ? error.info : { code: "FALLO", message: "No pudimos completar la acción. Vuelve a intentarlo." }; }
export const emptyDelivery: DatosEntrega = { fecha: "", franja: "", compradorNombre: "", compradorTelefono: "", destinatarioNombre: "", destinatarioTelefono: "", direccion: "", barrio: "", referencias: "", dedicatoria: "" };
export function validateDelivery(entrega: DatosEntrega): Record<string, string> {
  const fields: Record<string, string> = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entrega.fecha)) fields.fecha = "Elige una fecha de entrega.";
  if (!["manana", "tarde"].includes(entrega.franja)) fields.franja = "Elige una franja disponible.";
  for (const key of ["compradorNombre", "destinatarioNombre", "barrio"] as const) if (!entrega[key].trim() || entrega[key].trim().length > 100) fields[key] = "Escribe entre 1 y 100 caracteres.";
  for (const key of ["compradorTelefono", "destinatarioTelefono"] as const) if (!/^(?:\+57)?\d{10}$/.test(entrega[key].replace(/\s/g, ""))) fields[key] = "Escribe diez dígitos colombianos, con +57 opcional.";
  if (entrega.direccion.trim().length < 5 || entrega.direccion.trim().length > 200) fields.direccion = "Escribe una dirección de 5 a 200 caracteres.";
  for (const key of ["referencias", "dedicatoria"] as const) if (entrega[key].trim().length > 300) fields[key] = "Usa como máximo 300 caracteres.";
  return fields;
}
let sessionFlight: Promise<void> | null = null;
function expectationKey() {
  if (window.top === window) return "petalo-session-expected:direct";
  const ancestors = (window.location as Location & { ancestorOrigins?: DOMStringList }).ancestorOrigins;
  const topOrigin = ancestors?.length ? ancestors[ancestors.length - 1] : "unknown-parent";
  return `petalo-session-expected:embedded:${topOrigin}`;
}
export async function ensureSession(recover = false): Promise<void> {
  if (sessionFlight) return sessionFlight;
  const run = async () => {
    const key = expectationKey();
    let expected = false;
    try { expected = localStorage.getItem(key) === "1"; } catch { /* Cookie check remains authoritative. */ }
    try { await api("/api/sesion", { accion: "comprobar" }); }
    catch (error) {
      if (!(error instanceof PetaloError) || error.status !== 401) throw error;
      if (expected && !recover) throw new PetaloError(401, { code: "SESION_PERDIDA", message: "No podemos acceder a la sesión anterior. Tus datos siguen aquí. Reintenta o recupera el acceso explícitamente." });
      await api("/api/sesion", { accion: recover ? "recuperar" : "iniciar" });
      try { await api("/api/sesion", { accion: "comprobar" }); }
      catch { throw new PetaloError(401, { code: "SESION_BLOQUEADA", message: "El navegador no permite conservar la sesión. Reintenta o abre el sitio directamente." }); }
    }
    try { localStorage.setItem(key, "1"); } catch { /* No token or private form value is stored. */ }
  };
  sessionFlight = (async () => {
    if (navigator.locks) await navigator.locks.request("petalo-session-initialize", run);
    else await run();
  })().finally(() => { sessionFlight = null; });
  return sessionFlight;
}
export const recoveryKeyName = "petalo-last-operation";
export function trackBooking() { const w = window as Window & { constructorTrack?: (event: string) => void }; w.constructorTrack?.("Booking started"); }
