import { calendar } from "@/lib/server/catalog";
import { handle, query, success } from "@/lib/server/http";
import { ownerOrders } from "@/lib/server/orders";
import { requireOwnerSession } from "@/lib/server/owner";
import { date } from "@/lib/server/validation";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return handle(async () => {
    await requireOwnerSession();
    const requested = query(request, ["fecha"]).get("fecha");
    return success(await ownerOrders(requested === null ? calendar().hoy : date(requested)));
  });
}
