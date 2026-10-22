import type { Metadata } from "next";
import { PublicRepoCheck } from "@/components/PublicRepoCheck";
import { PageHead } from "@/components/ui";

export const metadata: Metadata = { title: "Repository checks", description: "PHP vulnerability checks and hourly monitoring for public GitHub repositories.", alternates: { canonical: "/check" } };

export default function CheckPage() {
  return <><PageHead eyebrow="/check" title="AGENT REPOSITORY CHECKS" meta={[["access", "public repositories"], ["cadence", "hourly"], ["focus", "PHP2Shell"], ["history", "/api/v1/public-checks"]]}>Check a public GitHub repository for affected PHP version pins. The agent schedules saved repositories for another check every hour.</PageHead><div className="mx-auto mt-12 max-w-[1560px] px-4 md:px-8"><PublicRepoCheck /></div></>;
}
