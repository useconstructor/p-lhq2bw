import { assertOrigin, handle, json, query, success } from "@/lib/server/http";
import { saveOrder } from "@/lib/server/orders";
import { requireSession } from "@/lib/server/sessions";
import { normalizeSubmission } from "@/lib/server/validation";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return handle(async () => {
    assertOrigin(request);
    query(request, []);
    const sessionHash = await requireSession();
    const input = normalizeSubmission(await json(request));
    const result = await saveOrder(input, sessionHash);
    return success(result, result.reutilizado ? 200 : 201);
  });
}
