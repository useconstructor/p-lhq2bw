import { assertOrigin, handle, json, query, success } from "@/lib/server/http";
import { review } from "@/lib/server/orders";
import { requireSession } from "@/lib/server/sessions";
import { normalizeDraft } from "@/lib/server/validation";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return handle(async () => {
    assertOrigin(request);
    query(request, []);
    await requireSession();
    const draft = normalizeDraft(await json(request));
    return success(await review(draft));
  });
}
