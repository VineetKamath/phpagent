import type { Metadata } from "next";
import { PublicRepoCheck } from "@/components/PublicRepoCheck";
import { PageHead } from "@/components/ui";

export const metadata: Metadata = { title: "Check a public repository", description: "Read-only PHP runtime pin analysis for a public GitHub repository.", alternates: { canonical: "/check" } };

export default function CheckPage() {
  return <><PageHead eyebrow="/check" title="Check a public repository." meta={[["access", "public repositories only"], ["mode", "read-only"], ["writes", "never"], ["api", "/api/v1/public-check"]]}>Enter a public GitHub repository to inspect explicit PHP image, Composer platform, and CI pins. This check does not install the App or change the repository.</PageHead><div className="mx-auto mt-12 max-w-4xl px-4 md:px-8"><PublicRepoCheck /></div></>;
}
