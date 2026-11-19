import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { DomainError, assertOrigin, json, keys, object, sessionCookieOptions, success, invalid } from "./http";
import { ensureSchema, writeTransaction } from "./schema";

const COOKIE = "petalo_session";
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const tokenHash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function session(): Promise<{ hash: string | null; supplied: boolean }> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return { hash: null, supplied: false };
  if (!tokenPattern.test(token)) return { hash: null, supplied: true };
  await ensureSchema();
  const hash = tokenHash(token);
  const found = await db.execute({ sql: "SELECT hash FROM petalo_sesiones WHERE hash=?", args: [hash] });
  return { hash: found.rows.length ? hash : null, supplied: true };
}

export async function requireSession(): Promise<string> {
  const current = await session();
  if (!current.hash) throw new DomainError(401, "SESION_REQUERIDA", "Comprueba tu sesión para continuar.");
  return current.hash;
}

export async function sessionAction(request: Request) {
  const origin = assertOrigin(request);
  const body = object(await json(request), "solicitud");
  keys(body, ["accion"]);
  if (!["comprobar", "iniciar", "recuperar"].includes(String(body.accion))) {
    invalid({ accion: "Elige comprobar, iniciar o recuperar." });
  }
  const current = await session();
  // Preserve an existing valid owner, including an explicit recovery request.
  if (current.hash) return success({ establecida: true });
  if (body.accion === "comprobar") throw new DomainError(401, "SESION_REQUERIDA", "No pudimos comprobar tu sesión.");
  if (current.supplied && body.accion !== "recuperar") {
    throw new DomainError(401, "SESION_REQUERIDA", "Tu sesión requiere recuperación explícita.");
  }
  const token = randomBytes(32).toString("base64url");
  await writeTransaction(async (tx) => {
    await tx.execute({
      sql: "INSERT INTO petalo_sesiones(hash,creado_en) VALUES(?,?)",
      args: [tokenHash(token), new Date().toISOString()],
    });
  });
  const response = success({ establecida: true });
  response.cookies.set(COOKIE, token, sessionCookieOptions(origin, 60 * 60 * 24 * 30));
  return response;
}
