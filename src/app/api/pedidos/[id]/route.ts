import { handle, query, success } from "@/lib/server/http";
import { unavailable, visitorOrder } from "@/lib/server/orders";
import { requireSession } from "@/lib/server/sessions";

export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    query(request, []);
    const sessionHash = await requireSession();
    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) unavailable();
    return success(await visitorOrder(id.toLowerCase(), sessionHash));
  });
}
