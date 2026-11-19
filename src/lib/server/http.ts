import { NextResponse } from "next/server";
import type { ApiError } from "./contracts";

export class DomainError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: Omit<ApiError, "code" | "message"> = {},
  ) {
    super(message);
  }
}

const privateHeaders = { "Cache-Control": "no-store, max-age=0", Vary: "Cookie, Origin" };

export function success<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status, headers: privateHeaders });
}

export function failure(error: unknown, legacy = false) {
  const known = error instanceof DomainError
    ? error
    : new DomainError(503, "FALLO", "No pudimos completar la consulta. Inténtalo de nuevo.");
  const value = { code: known.code, message: known.message, ...known.details };
  const response = NextResponse.json(
    legacy ? { error: known.message, code: known.code, ...known.details } : { ok: false, error: value },
    { status: known.status, headers: privateHeaders },
  );
  if (known.status === 429 && known.details.retryAt) {
    response.headers.set("Retry-After", String(Math.max(1, Math.ceil((Date.parse(known.details.retryAt) - Date.now()) / 1000))));
  }
  return response;
}

export async function handle(work: () => Promise<Response>, legacy = false): Promise<Response> {
  try { return await work(); } catch (error) { return failure(error, legacy); }
}

function configuredOrigins(): string[] {
  const preview = process.env.VERCEL_URL;
  const values = [process.env.APP_ORIGIN, preview ? (preview.includes("://") ? preview : `https://${preview}`) : undefined];
  return values.filter((value): value is string => Boolean(value)).map((value) => {
    const parsed = new URL(value);
    if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error("Invalid origin configuration");
    return parsed.origin;
  });
}

/** Trust only deployment configuration, never Host or proxy-supplied headers. */
export function assertOrigin(request: Request): string {
  const origin = request.headers.get("origin");
  if (!origin || !configuredOrigins().includes(origin)) {
    throw new DomainError(403, "ORIGEN_NO_PERMITIDO", "Esta solicitud no está permitida.");
  }
  return origin;
}

export function sessionCookieOptions(origin: string, maxAge: number) {
  const secure = new URL(origin).protocol === "https:";
  return {
    httpOnly: true,
    path: "/",
    maxAge,
    secure,
    sameSite: secure ? "none" as const : "lax" as const,
    ...(secure ? { partitioned: true } : {}),
  };
}

export function invalid(fields: Record<string, string>): never {
  throw new DomainError(400, "VALIDACION", "Revisa los campos indicados.", { fields });
}

export function object(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid({ [path]: "Debe ser un objeto." });
  return value as Record<string, unknown>;
}

export function keys(value: Record<string, unknown>, allowed: readonly string[], path = "") {
  const fields: Record<string, string> = Object.create(null);
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fields[path ? `${path}.${key}` : key] = "Este campo no está permitido.";
  }
  if (Object.keys(fields).length) invalid(fields);
}

export async function json(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    invalid({ solicitud: "Envía un objeto JSON." });
  }
  // The full legitimate maximum form is far smaller than this transport bound.
  const limit = 65536;
  if (Number(request.headers.get("content-length")) > limit) invalid({ solicitud: "La solicitud es demasiado grande." });
  const reader = request.body?.getReader();
  if (!reader) invalid({ solicitud: "Envía un objeto JSON." });
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      bytes += item.value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        invalid({ solicitud: "La solicitud es demasiado grande." });
      }
      chunks.push(item.value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { invalid({ solicitud: "El JSON no es válido." }); }
}

export function query(request: Request, allowed: string[]) {
  const params = new URL(request.url).searchParams;
  for (const key of params.keys()) {
    if (!allowed.includes(key)) invalid({ [key]: "Este parámetro no está permitido." });
    if (params.getAll(key).length !== 1) invalid({ [key]: "Envía este parámetro una sola vez." });
  }
  return params;
}
