import { projectInfo } from "@/lib/project";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";
export async function GET() {
  return json(await projectInfo());
}
