import { handle, query } from "@/lib/server/http";
import { ownerLogout } from "@/lib/server/owner";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return handle(async () => {
    query(request, []);
    return ownerLogout(request);
  });
}
