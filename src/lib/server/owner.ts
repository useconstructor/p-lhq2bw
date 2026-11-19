import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
  OWNER_COOKIE, createOwnerToken, isOwner, ownerCodeMatches,
  recordSignInFailure, signInAllowed,
} from "@/lib/owner-access";
import { DomainError, assertOrigin, invalid, json, keys, object, sessionCookieOptions, success } from "./http";

const WINDOW = 15 * 60 * 1000;
// Credential-scoped protection cannot be bypassed using caller-supplied proxy IPs.
// The existing adapter retains the ten-failure policy; this map supplies its reset time.
const windows = new Map<string, number>();

function configured() {
  if (!process.env.JWT_SECRET || !process.env.OWNER_ACCESS_CODE) throw new Error("Owner configuration required");
}

export async function requireOwnerSession() {
  configured();
  if (!(await isOwner())) throw new DomainError(401, "ACCESO_REQUERIDO", "Inicia sesión como dueña para continuar.");
}

export async function ownerStatus() {
  configured();
  return NextResponse.json({ owner: await isOwner() }, { headers: { "Cache-Control": "no-store", Vary: "Cookie" } });
}

export async function ownerLogin(request: Request, legacy = false) {
  const origin = assertOrigin(request);
  configured();
  const key = createHash("sha256").update(`petalo-owner:${process.env.OWNER_ACCESS_CODE}`).digest("hex");
  const now = Date.now();
  if (!signInAllowed(key, now)) {
    throw new DomainError(429, "DEMASIADOS_INTENTOS", "Demasiados intentos. Espera unos minutos antes de continuar.", {
      retryAt: new Date(windows.get(key) ?? now + WINDOW).toISOString(),
    });
  }
  const body = object(await json(request), "solicitud");
  keys(body, ["code"]);
  if (typeof body.code !== "string" || !body.code.length) invalid({ code: "Escribe el código de acceso." });
  if (!ownerCodeMatches(body.code)) {
    const reset = windows.get(key);
    if (!reset || reset < now) windows.set(key, now + WINDOW);
    recordSignInFailure(key, now);
    throw new DomainError(401, "ACCESO_INVALIDO", "El código de acceso no es correcto.");
  }
  const response = legacy
    ? NextResponse.json({ owner: true }, { headers: { "Cache-Control": "no-store", Vary: "Cookie, Origin" } })
    : success({ owner: true });
  response.cookies.set(OWNER_COOKIE, createOwnerToken(), sessionCookieOptions(origin, 12 * 60 * 60));
  return response;
}

export async function ownerLogout(request: Request, legacy = false) {
  const origin = assertOrigin(request);
  if (!legacy) keys(object(await json(request), "solicitud"), []);
  const response = legacy
    ? NextResponse.json({ owner: false }, { headers: { "Cache-Control": "no-store", Vary: "Cookie, Origin" } })
    : success({ owner: false });
  response.cookies.set(OWNER_COOKIE, "", sessionCookieOptions(origin, 0));
  return response;
}
