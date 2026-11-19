import { handle, query } from "@/lib/server/http";
import { sessionAction } from "@/lib/server/sessions";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return handle(async () => {
    query(request, []);
    return sessionAction(request);
  });
}
