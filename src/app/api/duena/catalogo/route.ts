import { assertOrigin, handle, invalid, json, keys, object, query, success } from "@/lib/server/http";
import { editCatalog } from "@/lib/server/orders";
import { requireOwnerSession } from "@/lib/server/owner";
import { arregloId, integer } from "@/lib/server/validation";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return handle(async () => {
    assertOrigin(request);
    query(request, []);
    await requireOwnerSession();
    const body = object(await json(request), "solicitud");
    keys(body, ["arregloId", "revisionEsperada", "stock", "activo"]);
    if (!Object.hasOwn(body, "stock") && !Object.hasOwn(body, "activo")) {
      invalid({ stock: "Modifica las existencias o la disponibilidad." });
    }
    const edit: { stock?: number; activo?: boolean } = {};
    if (Object.hasOwn(body, "stock")) edit.stock = integer(body.stock, "stock");
    if (Object.hasOwn(body, "activo")) {
      if (typeof body.activo !== "boolean") invalid({ activo: "La disponibilidad debe ser verdadera o falsa." });
      edit.activo = body.activo;
    }
    return success(await editCatalog(arregloId(body.arregloId), integer(body.revisionEsperada, "revisionEsperada", 1), edit));
  });
}
