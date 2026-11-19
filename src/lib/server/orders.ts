import { randomUUID } from "node:crypto";
import type { Row } from "@libsql/client";
import type { Arreglo, ArregloId, Borrador, Cotizacion, DatosEntrega, Envio, Estado, LineaCongelada, Pedido, Revision } from "./contracts";
import { catalog, materializeSlots, requireSlot, type Reader } from "./catalog";
import { DomainError, invalid } from "./http";
import { readTransaction, writeTransaction } from "./schema";

export async function quote(reader: Reader, draft: Borrador): Promise<Cotizacion> {
  const arrangements = await catalog(reader);
  const lineas: LineaCongelada[] = [];
  let subtotal = 0;
  for (const [index, line] of draft.lineas.entries()) {
    const current = arrangements.find((item) => item.id === line.arregloId);
    if (!current || !current.activo) {
      throw new DomainError(409, "ARREGLO_NO_DISPONIBLE", "Un arreglo ya no está disponible. Conservamos tu selección.", {
        fields: { [`lineas.${index}.arregloId`]: "Consulta otro arreglo o actualiza la disponibilidad." },
        local: line, current: current ?? null,
      });
    }
    if (line.cantidad > current.stock) {
      throw new DomainError(409, "SIN_STOCK", "No hay existencias suficientes para esta selección.", {
        fields: { [`lineas.${index}.cantidad`]: `Disponibles: ${current.stock}.` },
        local: line, current,
      });
    }
    const totalLinea = current.precio * line.cantidad;
    if (!Number.isSafeInteger(totalLinea) || !Number.isSafeInteger(subtotal + totalLinea + 12000)) {
      invalid({ [`lineas.${index}.cantidad`]: "El importe de esta cantidad supera el rango permitido." });
    }
    subtotal += totalLinea;
    lineas.push({
      arregloId: current.id, nombre: current.nombre, descripcion: current.descripcion,
      cantidad: line.cantidad, precioUnitario: current.precio, totalLinea,
      catalogoRevision: current.revision, vectorVersion: current.vectorVersion, rendererVersion: current.rendererVersion,
    });
  }
  await requireSlot(reader, draft.entrega.fecha, draft.entrega.franja);
  return { lineas, subtotal, domicilio: 12000, total: subtotal + 12000 };
}

export async function review(draft: Borrador): Promise<Revision> {
  return readTransaction(async (tx) => ({ borrador: draft, cotizacion: await quote(tx, draft) }));
}

function checkExpected(local: Cotizacion, current: Cotizacion) {
  const moneyChanged = local.subtotal !== current.subtotal || local.domicilio !== current.domicilio || local.total !== current.total ||
    local.lineas.some((line, index) =>
      line.precioUnitario !== current.lineas[index]?.precioUnitario || line.totalLinea !== current.lineas[index]?.totalLinea);
  if (moneyChanged) {
    throw new DomainError(409, "PRECIO_CAMBIO", "El importe no coincide con la revisión actual. Revisa antes de guardar.", { local, current });
  }
  if (JSON.stringify(local) !== JSON.stringify(current)) {
    throw new DomainError(409, "CATALOGO_CAMBIO", "El catálogo cambió. Revisa la selección antes de guardar.", { local, current });
  }
}

function toLine(row: Row): LineaCongelada {
  return {
    arregloId: row.arreglo_id as ArregloId, nombre: String(row.nombre), descripcion: String(row.descripcion),
    cantidad: Number(row.cantidad), precioUnitario: Number(row.precio_unitario), totalLinea: Number(row.total_linea),
    catalogoRevision: Number(row.catalogo_revision), vectorVersion: String(row.vector_version), rendererVersion: String(row.renderer_version),
  };
}

export function unavailable(): never {
  throw new DomainError(404, "NO_DISPONIBLE", "El pedido no está disponible en esta sesión.");
}

/** Passing no session is allowed only behind the owner guard. */
export async function readOrder(reader: Reader, id: string, sessionHash?: string): Promise<Pedido> {
  const result = await reader.execute({
    sql: sessionHash
      ? "SELECT * FROM petalo_pedidos WHERE id=? AND sesion_hash=?"
      : "SELECT * FROM petalo_pedidos WHERE id=?",
    args: sessionHash ? [id, sessionHash] : [id],
  });
  const row = result.rows[0];
  if (!row) unavailable();
  const lines = await reader.execute({ sql: "SELECT * FROM petalo_lineas WHERE pedido_id=? ORDER BY posicion", args: [id] });
  const history = await reader.execute({
    sql: `SELECT estado,creado_en FROM petalo_historial WHERE pedido_id=?
      ORDER BY CASE estado WHEN 'recibido' THEN 0 WHEN 'en_preparacion' THEN 1 WHEN 'en_camino' THEN 2 ELSE 3 END`,
    args: [id],
  });
  return {
    id: String(row.id), creadoEn: String(row.creado_en), estado: row.estado as Estado,
    entrega: JSON.parse(String(row.entrega_json)) as DatosEntrega,
    lineas: lines.rows.map(toLine),
    subtotal: Number(row.subtotal), domicilio: Number(row.domicilio), total: Number(row.total),
    historial: history.rows.map((entry) => ({ estado: entry.estado as Estado, creadoEn: String(entry.creado_en) })),
  };
}

export async function visitorOrder(id: string, sessionHash: string) {
  return readTransaction(async (tx) => ({ pedido: await readOrder(tx, id, sessionHash) }));
}

export async function saveOrder(input: Envio, sessionHash: string): Promise<{ pedido: Pedido; reutilizado: boolean }> {
  // Reconstructed normalized property order makes equivalent JSON objects equal,
  // while retaining line order and every submitted value in the intent.
  const payload = JSON.stringify({ borrador: input.borrador, cotizacion: input.cotizacion });
  return writeTransaction(async (tx) => {
    const previous = await tx.execute({
      sql: "SELECT payload_json,resultado_json FROM petalo_idempotencia WHERE sesion_hash=? AND clave=?",
      args: [sessionHash, input.clave],
    });
    if (previous.rows.length) {
      if (String(previous.rows[0].payload_json) !== payload) {
        throw new DomainError(409, "IDEMPOTENCIA_CONFLICTO", "Esta referencia corresponde a otro envío. Recupera el pedido original antes de continuar.");
      }
      // Replay precedes current stock/time checks and returns the exact first result.
      return { pedido: JSON.parse(String(previous.rows[0].resultado_json)) as Pedido, reutilizado: true };
    }
    const current = await quote(tx, input.borrador);
    checkExpected(input.cotizacion, current);
    const { entrega } = input.borrador;
    await materializeSlots(tx, entrega.fecha);
    // Recheck the original start boundary immediately before the capacity mutation.
    await requireSlot(tx, entrega.fecha, entrega.franja);
    const slot = await tx.execute({
      sql: "UPDATE petalo_franjas SET ocupados=ocupados+1 WHERE fecha=? AND franja=? AND ocupados<capacidad",
      args: [entrega.fecha, entrega.franja],
    });
    if (slot.rowsAffected !== 1) throw new DomainError(409, "FRANJA_NO_DISPONIBLE", "La franja se completó. Elige otra.");
    for (const line of current.lineas) {
      const changed = await tx.execute({
        sql: `UPDATE petalo_arreglos SET stock=stock-?,revision=revision+1
          WHERE id=? AND activo=1 AND stock>=? AND revision=? AND precio=? AND revision<9007199254740991`,
        args: [line.cantidad, line.arregloId, line.cantidad, line.catalogoRevision, line.precioUnitario],
      });
      if (changed.rowsAffected !== 1) throw new DomainError(409, "SIN_STOCK", "Las existencias cambiaron. Revisa tu selección.");
    }
    const id = randomUUID();
    const creadoEn = new Date().toISOString();
    const pedido: Pedido = {
      id, creadoEn, estado: "recibido", entrega, ...current,
      historial: [{ estado: "recibido", creadoEn }],
    };
    await tx.execute({
      sql: `INSERT INTO petalo_pedidos
        (id,sesion_hash,creado_en,estado,fecha,franja,entrega_json,subtotal,domicilio,total)
        VALUES(?,?,?,'recibido',?,?,?,?,?,?)`,
      args: [id, sessionHash, creadoEn, entrega.fecha, entrega.franja, JSON.stringify(entrega), current.subtotal, current.domicilio, current.total],
    });
    for (const [index, line] of current.lineas.entries()) {
      await tx.execute({
        sql: `INSERT INTO petalo_lineas
          (pedido_id,posicion,arreglo_id,nombre,descripcion,cantidad,precio_unitario,total_linea,catalogo_revision,vector_version,renderer_version)
          VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
        args: [id, index, line.arregloId, line.nombre, line.descripcion, line.cantidad, line.precioUnitario,
          line.totalLinea, line.catalogoRevision, line.vectorVersion, line.rendererVersion],
      });
    }
    await tx.execute({
      sql: "INSERT INTO petalo_historial(pedido_id,estado,creado_en) VALUES(?,'recibido',?)",
      args: [id, creadoEn],
    });
    await tx.execute({
      sql: "INSERT INTO petalo_idempotencia(sesion_hash,clave,payload_json,pedido_id,resultado_json) VALUES(?,?,?,?,?)",
      args: [sessionHash, input.clave, payload, id, JSON.stringify(pedido)],
    });
    return { pedido, reutilizado: false };
  });
}

export async function recoverOrder(clave: string, sessionHash: string): Promise<{ encontrado: boolean; pedido?: Pedido }> {
  return readTransaction(async (tx) => {
    const result = await tx.execute({
      sql: "SELECT pedido_id FROM petalo_idempotencia WHERE sesion_hash=? AND clave=?",
      args: [sessionHash, clave],
    });
    if (!result.rows.length) return { encontrado: false };
    return { encontrado: true, pedido: await readOrder(tx, String(result.rows[0].pedido_id), sessionHash) };
  });
}

export async function ownerOrders(fecha: string) {
  return readTransaction(async (tx) => {
    const result = await tx.execute({
      sql: "SELECT id FROM petalo_pedidos WHERE fecha=? ORDER BY CASE franja WHEN 'manana' THEN 0 ELSE 1 END,creado_en,id",
      args: [fecha],
    });
    const pedidos: Pedido[] = [];
    for (const row of result.rows) pedidos.push(await readOrder(tx, String(row.id)));
    return { fecha, pedidos };
  });
}

const nextState: Partial<Record<Estado, Estado>> = {
  recibido: "en_preparacion", en_preparacion: "en_camino", en_camino: "entregado",
};
export async function changeState(id: string, expected: Estado, estado: Estado) {
  return writeTransaction(async (tx) => {
    const current = await readOrder(tx, id);
    if (current.estado !== expected || nextState[current.estado] !== estado) {
      throw new DomainError(409, "ESTADO_CONFLICTO", "El estado cambió o la transición no está permitida. Consulta el pedido.", {
        local: { id, estadoEsperado: expected, estado }, current,
      });
    }
    const updated = await tx.execute({
      sql: "UPDATE petalo_pedidos SET estado=? WHERE id=? AND estado=?",
      args: [estado, id, expected],
    });
    if (updated.rowsAffected !== 1) throw new DomainError(409, "ESTADO_CONFLICTO", "El pedido cambió. Consulta su estado.");
    await tx.execute({
      sql: "INSERT INTO petalo_historial(pedido_id,estado,creado_en) VALUES(?,?,?)",
      args: [id, estado, new Date().toISOString()],
    });
    return { pedido: await readOrder(tx, id) };
  });
}

export async function editCatalog(id: ArregloId, revision: number, edit: { stock?: number; activo?: boolean }) {
  return writeTransaction(async (tx) => {
    const current = (await catalog(tx)).find((item) => item.id === id);
    if (!current) throw new DomainError(404, "NO_DISPONIBLE", "El arreglo no está disponible.");
    if (current.revision !== revision || !Number.isSafeInteger(revision + 1)) {
      throw new DomainError(409, "REVISION_CONFLICTO", "El catálogo cambió. Consulta los valores actuales y vuelve a editar.", {
        local: { arregloId: id, revisionEsperada: revision, ...edit }, current,
      });
    }
    const changed = await tx.execute({
      sql: "UPDATE petalo_arreglos SET stock=?,activo=?,revision=revision+1 WHERE id=? AND revision=?",
      args: [edit.stock ?? current.stock, (edit.activo ?? current.activo) ? 1 : 0, id, revision],
    });
    if (changed.rowsAffected !== 1) throw new DomainError(409, "REVISION_CONFLICTO", "El catálogo cambió. Consulta sus valores.");
    return { arreglo: (await catalog(tx)).find((item) => item.id === id) as Arreglo };
  });
}
