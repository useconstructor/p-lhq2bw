import { handle, query } from "@/lib/server/http";
import { ownerLogin, ownerLogout, ownerStatus } from "@/lib/server/owner";

export const dynamic = "force-dynamic";

/** GET → { owner: boolean } */
export async function GET(request: Request) {
  return handle(async () => {
    query(request, []);
    return ownerStatus();
  }, true);
}

/** POST { code } → signs the owner in with the provisioned OWNER_ACCESS_CODE. */
export async function POST(request: Request) {
  return handle(async () => {
    query(request, []);
    return ownerLogin(request, true);
  }, true);
}

/** DELETE → signs the owner out. */
export async function DELETE(request: Request) {
  return handle(async () => {
    query(request, []);
    return ownerLogout(request, true);
  }, true);
}
