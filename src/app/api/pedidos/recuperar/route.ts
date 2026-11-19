import { assertOrigin, handle, json, keys, object, query, success } from "@/lib/server/http";
import { recoverOrder } from "@/lib/server/orders";
import { requireSession } from "@/lib/server/sessions";
import { uuid } from "@/lib/server/validation";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return handle(async () => {
    assertOrigin(request);
    query(request, []);
    const sessionHash = await requireSession();
    const input = object(await json(request), "solicitud");
    keys(input, ["clave"]);
    return success(await recoverOrder(uuid(input.clave), sessionHash));
  });
}
