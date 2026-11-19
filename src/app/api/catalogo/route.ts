import { publicCatalog } from "@/lib/server/catalog";
import { handle, query, success } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return handle(async () => {
    query(request, []);
    return success(await publicCatalog());
  });
}
