import { db } from "@/lib/db";
import type { Row, Transaction } from "@libsql/client";
import type { Arreglo, ArregloId, Disponibilidad, Franja, FranjaId } from "./contracts";
import { DomainError, invalid } from "./http";
import { ensureSchema, writeTransaction } from "./schema";
import { date } from "./validation";

export type Reader = Pick<Transaction, "execute">;
export function toArreglo(row: Row): Arreglo {
  return {
    id: row.id as ArregloId, nombre: String(row.nombre), descripcion: String(row.descripcion),
    precio: Number(row.precio), stock: Number(row.stock), activo: Number(row.activo) === 1,
    revision: Number(row.revision), vectorVersion: String(row.vector_version), rendererVersion: String(row.renderer_version),
  };
}
export async function catalog(reader: Reader = db): Promise<Arreglo[]> {
  const rows = await reader.execute("SELECT * FROM petalo_arreglos ORDER BY CASE id WHEN 'brisa' THEN 0 WHEN 'pulso' THEN 1 WHEN 'claro' THEN 2 ELSE 3 END,id");
  return rows.rows.map(toArreglo);
}
export async function publicCatalog() {
  await ensureSchema();
  return { arreglos: await catalog() };
}

export function calendar(now = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const max = new Date(`${today}T12:00:00Z`);
  max.setUTCDate(max.getUTCDate() + 30);
  return { hoy: today, fechaMin: today, fechaMax: max.toISOString().slice(0, 10), ahora: now.toISOString() };
}
const periods = [
  { id: "manana", inicio: "09:00", fin: "12:00" },
  { id: "tarde", inicio: "14:00", fin: "18:00" },
] as const;

export function allowedDate(value: string, now = new Date()) {
  date(value, "entrega.fecha");
  const range = calendar(now);
  if (value < range.fechaMin || value > range.fechaMax) {
    invalid({ "entrega.fecha": "Elige desde hoy hasta los próximos treinta días." });
  }
  return range;
}

export async function materializeSlots(tx: Reader, fecha: string) {
  for (const period of periods) {
    await tx.execute({
      sql: "INSERT INTO petalo_franjas(fecha,franja,capacidad,ocupados) VALUES(?,?,6,0) ON CONFLICT(fecha,franja) DO NOTHING",
      args: [fecha, period.id],
    });
  }
}

export async function slots(reader: Reader, fecha: string, now = new Date()): Promise<Franja[]> {
  const rows = await reader.execute({ sql: "SELECT * FROM petalo_franjas WHERE fecha=?", args: [fecha] });
  return periods.map((period) => {
    const stored = rows.rows.find((row) => row.franja === period.id);
    const ocupados = stored ? Number(stored.ocupados) : 0;
    const capacidad = stored ? Number(stored.capacidad) : 6;
    const past = Date.parse(`${fecha}T${period.inicio}:00-05:00`) < now.getTime();
    return {
      ...period, capacidad, ocupados, disponibles: past ? 0 : Math.max(0, capacidad - ocupados),
      estado: past ? "pasada" : ocupados >= capacidad ? "completa" : "disponible",
    };
  });
}

export async function availability(raw: string | null): Promise<Disponibilidad> {
  const now = new Date();
  const fecha = raw === null ? calendar(now).hoy : date(raw);
  const range = allowedDate(fecha, now);
  return writeTransaction(async (tx) => {
    await materializeSlots(tx, fecha);
    return { ...range, fecha, franjas: await slots(tx, fecha, now) };
  });
}

export async function requireSlot(reader: Reader, fecha: string, franja: FranjaId, now = new Date()) {
  allowedDate(fecha, now);
  const current = (await slots(reader, fecha, now)).find((slot) => slot.id === franja);
  if (!current || current.estado !== "disponible") {
    throw new DomainError(409, "FRANJA_NO_DISPONIBLE", "La franja ya no está disponible. Elige otra fecha o franja.", {
      fields: { "entrega.franja": "Esta franja no está disponible." },
      local: { fecha, franja },
      current: current ? { fecha, ...current } : null,
    });
  }
}
