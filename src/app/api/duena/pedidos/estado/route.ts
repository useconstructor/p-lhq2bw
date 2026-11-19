import type { Estado } from "@/lib/server/contracts";
import { assertOrigin, handle, invalid, json, keys, object, query, success } from "@/lib/server/http";
import { changeState } from "@/lib/server/orders";
import { requireOwnerSession } from "@/lib/server/owner";
import { uuid } from "@/lib/server/validation";

export const dynamic = "force-dynamic";
const states = ["recibido", "en_preparacion", "en_camino", "entregado"];
export async function POST(request: Request) {
  return handle(async () => {
    assertOrigin(request);
    query(request, []);
    await requireOwnerSession();
    const body = object(await json(request), "solicitud");
    keys(body, ["id", "estadoEsperado", "estado"]);
    const fields: Record<string, string> = {};
    for (const key of ["estadoEsperado", "estado"]) {
      if (typeof body[key] !== "string" || !states.includes(body[key] as string)) fields[key] = "Elige un estado válido.";
    }
    if (Object.keys(fields).length) invalid(fields);
    return success(await changeState(uuid(body.id, "id"), body.estadoEsperado as Estado, body.estado as Estado));
  });
}
