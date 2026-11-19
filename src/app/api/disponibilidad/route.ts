import { availability } from "@/lib/server/catalog";
import { handle, query, success } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return handle(async () => success(await availability(query(request, ["fecha"]).get("fecha"))));
}
