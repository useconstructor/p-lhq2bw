import { db } from "@/lib/db";
import type { Transaction } from "@libsql/client";

let ready: Promise<void> | undefined;

// Business seed facts are explicitly supplied fictional records. Nothing is reset
// on reads/restarts, and no public asset or catalogue module is used as storage.
const statements = [
  `CREATE TABLE IF NOT EXISTS petalo_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS petalo_vectors (
    version TEXT PRIMARY KEY, arreglo_id TEXT NOT NULL, renderer_version TEXT NOT NULL,
    descripcion TEXT NOT NULL, UNIQUE(version, renderer_version)
  )`,
  `CREATE TABLE IF NOT EXISTS petalo_arreglos (
    id TEXT PRIMARY KEY, nombre TEXT NOT NULL, descripcion TEXT NOT NULL,
    precio INTEGER NOT NULL CHECK(typeof(precio)='integer' AND precio>0 AND precio<=9007199254740991),
    stock INTEGER NOT NULL CHECK(typeof(stock)='integer' AND stock>=0 AND stock<=9007199254740991),
    activo INTEGER NOT NULL CHECK(activo IN (0,1)),
    revision INTEGER NOT NULL CHECK(typeof(revision)='integer' AND revision>0 AND revision<=9007199254740991),
    vector_version TEXT NOT NULL, renderer_version TEXT NOT NULL,
    FOREIGN KEY(vector_version,renderer_version) REFERENCES petalo_vectors(version,renderer_version)
  )`,
  `CREATE TABLE IF NOT EXISTS petalo_franjas (
    fecha TEXT NOT NULL, franja TEXT NOT NULL CHECK(franja IN ('manana','tarde')),
    capacidad INTEGER NOT NULL DEFAULT 6 CHECK(capacidad=6),
    ocupados INTEGER NOT NULL DEFAULT 0 CHECK(typeof(ocupados)='integer' AND ocupados>=0 AND ocupados<=capacidad),
    PRIMARY KEY(fecha,franja)
  )`,
  `CREATE TABLE IF NOT EXISTS petalo_sesiones (
    hash TEXT PRIMARY KEY, creado_en TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS petalo_pedidos (
    id TEXT PRIMARY KEY, sesion_hash TEXT NOT NULL REFERENCES petalo_sesiones(hash),
    creado_en TEXT NOT NULL,
    estado TEXT NOT NULL CHECK(estado IN ('recibido','en_preparacion','en_camino','entregado')),
    fecha TEXT NOT NULL, franja TEXT NOT NULL, entrega_json TEXT NOT NULL,
    subtotal INTEGER NOT NULL CHECK(typeof(subtotal)='integer' AND subtotal>0 AND subtotal<=9007199254740991),
    domicilio INTEGER NOT NULL CHECK(domicilio=12000),
    total INTEGER NOT NULL CHECK(typeof(total)='integer' AND total=subtotal+domicilio AND total<=9007199254740991),
    FOREIGN KEY(fecha,franja) REFERENCES petalo_franjas(fecha,franja),
    UNIQUE(id,sesion_hash)
  )`,
  `CREATE TABLE IF NOT EXISTS petalo_lineas (
    pedido_id TEXT NOT NULL REFERENCES petalo_pedidos(id), posicion INTEGER NOT NULL CHECK(posicion>=0),
    arreglo_id TEXT NOT NULL REFERENCES petalo_arreglos(id),
    nombre TEXT NOT NULL, descripcion TEXT NOT NULL,
    cantidad INTEGER NOT NULL CHECK(typeof(cantidad)='integer' AND cantidad>0 AND cantidad<=9007199254740991),
    precio_unitario INTEGER NOT NULL CHECK(typeof(precio_unitario)='integer' AND precio_unitario>0 AND precio_unitario<=9007199254740991),
    total_linea INTEGER NOT NULL CHECK(typeof(total_linea)='integer' AND total_linea=cantidad*precio_unitario AND total_linea<=9007199254740991),
    catalogo_revision INTEGER NOT NULL CHECK(catalogo_revision>0),
    vector_version TEXT NOT NULL, renderer_version TEXT NOT NULL,
    FOREIGN KEY(vector_version,renderer_version) REFERENCES petalo_vectors(version,renderer_version),
    PRIMARY KEY(pedido_id,arreglo_id), UNIQUE(pedido_id,posicion)
  )`,
  `CREATE TABLE IF NOT EXISTS petalo_historial (
    pedido_id TEXT NOT NULL REFERENCES petalo_pedidos(id),
    estado TEXT NOT NULL CHECK(estado IN ('recibido','en_preparacion','en_camino','entregado')),
    creado_en TEXT NOT NULL, PRIMARY KEY(pedido_id,estado)
  )`,
  `CREATE TABLE IF NOT EXISTS petalo_idempotencia (
    sesion_hash TEXT NOT NULL REFERENCES petalo_sesiones(hash), clave TEXT NOT NULL,
    payload_json TEXT NOT NULL, pedido_id TEXT NOT NULL UNIQUE, resultado_json TEXT NOT NULL,
    PRIMARY KEY(sesion_hash,clave),
    FOREIGN KEY(pedido_id,sesion_hash) REFERENCES petalo_pedidos(id,sesion_hash)
  )`,
  `CREATE INDEX IF NOT EXISTS petalo_pedidos_fecha ON petalo_pedidos(fecha,franja,creado_en)`,
  `CREATE INDEX IF NOT EXISTS petalo_pedidos_sesion ON petalo_pedidos(sesion_hash,id)`,
];

async function initialize() {
  const tx = await db.transaction("write");
  try {
    for (const sql of statements) await tx.execute(sql);
    const marker = await tx.execute("SELECT value FROM petalo_meta WHERE key='catalogo_v1'");
    if (marker.rows.length === 0) {
      const seeds = [
        ["brisa", "Brisa", "Alstroemerias blancas, follaje y papel lavanda.", 85000, 12],
        ["pulso", "Pulso", "Gerberas fucsias, claveles rosados y papel blanco.", 115000, 8],
        ["claro", "Claro", "Girasoles, follaje y papel violeta.", 145000, 6],
      ] as const;
      for (const [id, nombre, descripcion, precio, stock] of seeds) {
        await tx.execute({
          sql: `INSERT INTO petalo_vectors(version,arreglo_id,renderer_version,descripcion)
            VALUES(?,?,'bouquet:v1',?) ON CONFLICT(version) DO NOTHING`,
          args: [`${id}:v1`, id, descripcion],
        });
        await tx.execute({
          sql: `INSERT INTO petalo_arreglos(id,nombre,descripcion,precio,stock,activo,revision,vector_version,renderer_version)
            VALUES(?,?,?,?,?,1,1,?,'bouquet:v1') ON CONFLICT(id) DO NOTHING`,
          args: [id, nombre, descripcion, precio, stock, `${id}:v1`],
        });
      }
      await tx.execute("INSERT INTO petalo_meta(key,value) VALUES('catalogo_v1','1')");
    }
    await tx.commit();
  } catch (error) {
    await rollback(tx, error);
  } finally { tx.close(); }
}

async function rollback(tx: Transaction, primary: unknown): Promise<never> {
  try { if (!tx.closed) await tx.rollback(); }
  catch (cleanup) {
    // Keep both causes internal; the API boundary returns only a sanitized FALLO.
    throw new AggregateError([primary, cleanup], "Transaction and rollback failed");
  }
  throw primary;
}

export function ensureSchema(): Promise<void> {
  if (!ready) ready = initialize().catch((error) => { ready = undefined; throw error; });
  return ready;
}

export async function writeTransaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
  await ensureSchema();
  const tx = await db.transaction("write");
  try {
    const result = await work(tx);
    await tx.commit();
    return result;
  } catch (error) {
    return await rollback(tx, error);
  } finally { tx.close(); }
}

export async function readTransaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
  await ensureSchema();
  const tx = await db.transaction("read");
  try {
    const result = await work(tx);
    await tx.commit();
    return result;
  } catch (error) {
    return await rollback(tx, error);
  } finally { tx.close(); }
}
