import { sources } from "@/content/sources";
import { json } from "@/lib/http";

export async function GET() {
  return json({ sources }, { maxAge: 3600 });
}
