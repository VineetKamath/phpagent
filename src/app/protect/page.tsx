import type { Metadata } from "next";
import { brand } from "@/content/brand";
import { PolicyEditor } from "@/components/PolicyEditor";
import { Cite, PageHead } from "@/components/ui";

export const metadata: Metadata = { title: "Protect your repo", description: "Opt a repository in with the GitHub App or a .patchbot policy. Least-privilege permissions.", alternates: { canonical: "/protect" } };

const PERMS: [string, string, string][] = [
  ["Metadata", "read", "List repositories you selected during installation."],
  ["Contents", "write", "Read Dockerfile, compose, CI and composer files; create a patch-agent/* branch and commit to it. Never the default branch."],
  ["Pull requests", "write", "Open the pull request and update its description."],
  ["Checks", "read", "Read CI results on the PR branch."],
];

export default function Protect() {
  return (
    <>
      <PageHead eyebrow="/protect" title="Protect your repo." meta={[["permissions","4, least privilege"],["writes","patch-agent/* only"],["default_branch","never touched"],["revoke","uninstall the app"]]}>
        Nothing happens to a repository until its owner opts in. Choose one path. You can revoke access at any time by uninstalling the App.
      </PageHead>
      <ol className="reveal mx-auto mt-12 flex max-w-[1560px] flex-wrap items-center gap-2 px-4 font-mono text-xs md:px-8" aria-label="What happens after you opt in">
        {["You install the App", ".patchbot narrows scope", "Agent scans pinned PHP", "PR on patch-agent/*", "Your CI runs", "You merge"].map((x, i, all) => (
          <li key={x} className="flex items-center gap-2"><span className={`rounded-full border px-4 py-2 ${i === all.length - 1 ? "border-ok/50 text-ok" : "border-php-deep bg-php-deep/15"}`}>{String(i + 1).padStart(2, "0")} {x}</span>{i < all.length - 1 && <span aria-hidden className="text-dim">→</span>}</li>
        ))}
      </ol>
      <div className="mx-auto mt-8 grid max-w-[1560px] gap-6 px-4 md:grid-cols-2 md:px-8 reveal">
        <div className="rounded-2xl border border-line bg-ink-2 p-8">
          <p className="eyebrow">Path 01</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">Install the GitHub App</h2>
          <p className="mt-3 text-steel">Select the repositories you want covered. Installation is the authorization.</p>
          {brand.githubApp ? (
            <a href={brand.githubApp} className="mt-6 inline-block rounded-full bg-paper px-6 py-3 text-sm font-medium text-ink">Install on GitHub →</a>
          ) : (
            <p className="mt-6 font-mono text-xs text-amber">GITHUB APP NOT YET PUBLISHED: installation link will appear here once it is live.</p>
          )}
        </div>
        <div className="rounded-2xl border border-line bg-ink-2 p-8">
          <p className="eyebrow">Path 02</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">Add a .patchbot file</h2>
          <p className="mt-3 text-steel">Narrow what the agent may do in a repository where the App is installed: severities, patch types, PR settings and verification requirements.</p>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-[1560px] px-4 md:px-8 reveal">
        <h2 className="eyebrow">Requested permissions<Cite id="github-app-permissions" /></h2>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {PERMS.map(([n, l, why]) => (
            <li key={n} className="grid gap-1 py-4 md:grid-cols-[200px_100px_1fr]">
              <span className="font-medium">{n}</span>
              <span className={`font-mono text-sm ${l === "read" ? "text-ok" : "text-amber"}`}>{l}</span>
              <span className="text-sm text-steel">{why}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-dim">Not requested: administration, secrets, workflows, actions, members, issues, deployments, environments.</p>
      </div>

      <div className="mx-auto mt-12 max-w-[1560px] px-4 md:px-8 reveal">
        <h2 className="h-section text-[clamp(32px,4vw,56px)]!">Policy editor</h2>
        <div className="mt-8"><PolicyEditor /></div>
      </div>
    </>
  );
}
