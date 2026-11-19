import type { ArregloId, Borrador, Cotizacion, DatosEntrega, Envio, FranjaId, LineaCongelada, LineaEntrada } from "./contracts";
import { invalid, keys, object } from "./http";

const arregloIds = ["brisa", "pulso", "claro"];
const entregaKeys = [
  "fecha", "franja", "compradorNombre", "compradorTelefono", "destinatarioNombre",
  "destinatarioTelefono", "direccion", "barrio", "referencias", "dedicatoria",
] as const;

export function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T12:00:00Z`)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}

export function date(value: unknown, field = "fecha"): string {
  if (!isDate(value)) invalid({ [field]: "Elige una fecha válida." });
  return value;
}

export function uuid(value: unknown, field = "clave"): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    invalid({ [field]: "La referencia no es válida." });
  }
  return value.toLowerCase();
}

export function arregloId(value: unknown, field = "arregloId"): ArregloId {
  if (typeof value !== "string" || !arregloIds.includes(value)) invalid({ [field]: "Elige un arreglo del catálogo." });
  return value as ArregloId;
}

export function integer(value: unknown, field: string, minimum = 0): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    invalid({ [field]: `Debe ser un número entero ${minimum === 0 ? "no negativo" : "positivo"} válido.` });
  }
  return value;
}

export function normalizeDraft(input: unknown): Borrador {
  const draft = object(input, "borrador");
  keys(draft, ["lineas", "entrega"]);
  const delivery = object(draft.entrega, "entrega");
  keys(delivery, entregaKeys, "entrega");
  const fields: Record<string, string> = Object.create(null);
  const text = (key: keyof DatosEntrega, min: number, max: number, optional = false): string => {
    const raw = delivery[key];
    if (optional && raw === undefined) return "";
    if (typeof raw !== "string") {
      fields[`entrega.${key}`] = optional ? "Escribe texto o deja el campo vacío." : "Completa este campo.";
      return "";
    }
    const value = raw.trim();
    if (value.length < min || value.length > max) fields[`entrega.${key}`] = `Escribe entre ${min} y ${max} caracteres.`;
    return value;
  };
  const phone = (key: "compradorTelefono" | "destinatarioTelefono"): string => {
    const raw = delivery[key];
    const value = typeof raw === "string" ? raw.replace(/\s/g, "").replace(/^\+57/, "") : "";
    if (!/^\d{10}$/.test(value)) fields[`entrega.${key}`] = "Escribe diez dígitos colombianos; puedes incluir espacios y +57.";
    return value;
  };
  if (!isDate(delivery.fecha)) fields["entrega.fecha"] = "Elige una fecha válida.";
  if (delivery.franja !== "manana" && delivery.franja !== "tarde") fields["entrega.franja"] = "Elige una franja de entrega.";
  const entrega: DatosEntrega = {
    fecha: typeof delivery.fecha === "string" ? delivery.fecha : "",
    franja: delivery.franja as FranjaId,
    compradorNombre: text("compradorNombre", 1, 100),
    compradorTelefono: phone("compradorTelefono"),
    destinatarioNombre: text("destinatarioNombre", 1, 100),
    destinatarioTelefono: phone("destinatarioTelefono"),
    direccion: text("direccion", 5, 200),
    barrio: text("barrio", 1, 100),
    referencias: text("referencias", 0, 300, true),
    dedicatoria: text("dedicatoria", 0, 300, true),
  };
  const lineas: LineaEntrada[] = [];
  if (!Array.isArray(draft.lineas) || !draft.lineas.length) {
    fields.lineas = "Agrega al menos un arreglo.";
  } else {
    const seen = new Set<string>();
    draft.lineas.forEach((raw, index) => {
      const path = `lineas.${index}`;
      const row = object(raw, path);
      keys(row, ["arregloId", "cantidad"], path);
      if (typeof row.arregloId !== "string" || !arregloIds.includes(row.arregloId)) {
        fields[`${path}.arregloId`] = "Elige un arreglo del catálogo.";
      } else if (seen.has(row.arregloId)) {
        fields[`${path}.arregloId`] = "Incluye una sola línea por arreglo.";
      } else { seen.add(row.arregloId); }
      if (typeof row.cantidad !== "number" || !Number.isSafeInteger(row.cantidad) || row.cantidad <= 0) {
        fields[`${path}.cantidad`] = "Escribe una cantidad entera positiva.";
      }
      lineas.push({ arregloId: row.arregloId as ArregloId, cantidad: row.cantidad as number });
    });
  }
  if (Object.keys(fields).length) invalid(fields);
  return { lineas, entrega };
}

const frozenKeys = [
  "arregloId", "nombre", "descripcion", "cantidad", "precioUnitario", "totalLinea",
  "catalogoRevision", "vectorVersion", "rendererVersion",
];
function snapshotText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 1000) invalid({ [field]: "La referencia de revisión no es válida." });
  return value;
}

export function normalizeQuote(input: unknown): Cotizacion {
  const quote = object(input, "cotizacion");
  keys(quote, ["lineas", "subtotal", "domicilio", "total"], "cotizacion");
  if (!Array.isArray(quote.lineas) || !quote.lineas.length) invalid({ "cotizacion.lineas": "Revisa nuevamente los arreglos." });
  const lineas: LineaCongelada[] = quote.lineas.map((raw, index) => {
    const path = `cotizacion.lineas.${index}`;
    const line = object(raw, path);
    keys(line, frozenKeys, path);
    return {
      arregloId: arregloId(line.arregloId, `${path}.arregloId`),
      nombre: snapshotText(line.nombre, `${path}.nombre`),
      descripcion: snapshotText(line.descripcion, `${path}.descripcion`),
      cantidad: integer(line.cantidad, `${path}.cantidad`, 1),
      precioUnitario: integer(line.precioUnitario, `${path}.precioUnitario`),
      totalLinea: integer(line.totalLinea, `${path}.totalLinea`),
      catalogoRevision: integer(line.catalogoRevision, `${path}.catalogoRevision`, 1),
      vectorVersion: snapshotText(line.vectorVersion, `${path}.vectorVersion`),
      rendererVersion: snapshotText(line.rendererVersion, `${path}.rendererVersion`),
    };
  });
  return {
    lineas,
    subtotal: integer(quote.subtotal, "cotizacion.subtotal"),
    domicilio: integer(quote.domicilio, "cotizacion.domicilio"),
    total: integer(quote.total, "cotizacion.total"),
  };
}

export function normalizeSubmission(input: unknown): Envio {
  const value = object(input, "envio");
  keys(value, ["clave", "borrador", "cotizacion"]);
  return {
    clave: uuid(value.clave),
    borrador: normalizeDraft(value.borrador),
    cotizacion: normalizeQuote(value.cotizacion),
  };
}
