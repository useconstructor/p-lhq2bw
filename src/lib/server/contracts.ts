/** Shared wire types only. Safe to import with `import type` in client code. */
export type ArregloId = "brisa" | "pulso" | "claro";
export type FranjaId = "manana" | "tarde";
export type Estado = "recibido" | "en_preparacion" | "en_camino" | "entregado";
export type Arreglo = {
  id: ArregloId;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  activo: boolean;
  revision: number;
  vectorVersion: string;
  rendererVersion: string;
};
export type LineaEntrada = { arregloId: ArregloId; cantidad: number };
export type DatosEntrega = {
  fecha: string;
  franja: FranjaId;
  compradorNombre: string;
  compradorTelefono: string;
  destinatarioNombre: string;
  destinatarioTelefono: string;
  direccion: string;
  barrio: string;
  referencias: string;
  dedicatoria: string;
};
export type Borrador = { lineas: LineaEntrada[]; entrega: DatosEntrega };
export type LineaCongelada = {
  arregloId: ArregloId;
  nombre: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  totalLinea: number;
  catalogoRevision: number;
  vectorVersion: string;
  rendererVersion: string;
};
export type Cotizacion = {
  lineas: LineaCongelada[];
  subtotal: number;
  domicilio: number;
  total: number;
};
export type Revision = { borrador: Borrador; cotizacion: Cotizacion };
export type Envio = { clave: string; borrador: Borrador; cotizacion: Cotizacion };
export type Pedido = {
  id: string;
  creadoEn: string;
  estado: Estado;
  entrega: DatosEntrega;
  lineas: LineaCongelada[];
  subtotal: number;
  domicilio: number;
  total: number;
  historial: { estado: Estado; creadoEn: string }[];
};
export type Franja = {
  id: FranjaId;
  inicio: string;
  fin: string;
  capacidad: number;
  ocupados: number;
  disponibles: number;
  estado: "disponible" | "completa" | "pasada";
};
export type Disponibilidad = {
  hoy: string;
  fechaMin: string;
  fechaMax: string;
  fecha: string;
  ahora: string;
  franjas: Franja[];
};
export type ApiError = {
  code: string;
  message: string;
  fields?: Record<string, string>;
  local?: unknown;
  current?: unknown;
  retryAt?: string;
};
export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };
