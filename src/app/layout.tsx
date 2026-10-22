import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { brand } from "@/content/brand";
import { AgentStatusDot } from "@/components/AgentStatusDot";
import { DemoBanner } from "@/components/DemoBanner";
import { ContractChip } from "@/components/ContractChip";
import { RevealRoot } from "@/components/RevealRoot";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(brand.siteUrl),
  title: { default: brand.brandName, template: `%s | ${brand.brandName}` },
  description: brand.description,
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: brand.brandName, title: brand.brandName, description: brand.description },
  twitter: { card: "summary_large_image", title: brand.brandName, description: brand.description },
};
export const viewport: Viewport = { themeColor: "#0c0d16", width: "device-width", initialScale: 1 };

const nav = [
  ["/live", "Live"],
  ["/architecture", "Architecture"],
  ["/patches", "Patches"],
  ["/research/php2shell", "Research"],
  ["/whitepaper", "Whitepaper"],
  ["/proof", "Proof"],
  ["/treasury", "Treasury"],
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", name: brand.brandName, url: brand.siteUrl },
    { "@type": "SoftwareApplication", name: brand.brandName, applicationCategory: "SecurityApplication", operatingSystem: "Web", description: brand.description, url: brand.siteUrl, softwareVersion: brand.version },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const demo = process.env.DEMO_MODE === "true";
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh">
        <noscript><style>{`.reveal,.mask>span{opacity:1!important;transform:none!important}`}</style></noscript>
        <RevealRoot />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-ink-3 focus:px-3 focus:py-2">
          Skip to content
        </a>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {demo && <DemoBanner />}
        <header className="no-print sticky top-0 z-40 border-b border-line/60 bg-ink/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-[1560px] items-center gap-6 px-4 md:px-8">
            <Link href="/" className="group flex shrink-0 items-center gap-2.5 font-semibold tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-php-deep shadow-[0_0_24px_-4px_rgba(119,123,180,.8)] transition group-hover:bg-php-500">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="" width={22} height={22} className="[image-rendering:pixelated]" />
              </span>
              <span className="hidden sm:inline">{brand.brandName}</span>
            </Link>
            <nav aria-label="Primary" className="hidden flex-1 items-center gap-5 text-sm text-steel xl:flex">
              {nav.map(([h, l]) => (
                <Link key={h} href={h} className="transition-colors hover:text-paper">
                  {l}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-3">
              <ContractChip initial={brand.contractAddress} network={brand.network} />
              <span className="hidden md:inline-flex"><AgentStatusDot /></span>
              <details className="relative xl:hidden">
                <summary className="cursor-pointer list-none font-mono text-xs text-steel">MENU</summary>
                <nav aria-label="Mobile" className="absolute right-0 mt-3 flex w-48 flex-col rounded-lg border border-line bg-ink-2 p-2 text-sm">
                  {[...nav, ["/status", "Status"], ["/protect", "Protect your repo"]].map(([h, l]) => (
                    <Link key={h} href={h} className="rounded px-3 py-2 hover:bg-ink-3">
                      {l}
                    </Link>
                  ))}
                </nav>
              </details>
            </div>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="no-print mt-24 border-t border-line">
          <div className="mx-auto grid max-w-[1560px] gap-10 px-4 py-14 text-sm text-steel md:grid-cols-4 md:px-8">
            <div className="md:col-span-2">
              <p className="font-mono text-xs text-dim">{"<?php agent::repair(); ?>"}</p>
              <p className="mt-3 max-w-sm">We don&apos;t count patches until you can verify them.</p>
            </div>
            <ul className="space-y-2">
              {[["/status", "Status"], ["/methodology", "Methodology"], ["/security", "Security"], ["/sources", "Sources"], ["/protect", "Protect your repo"]].map(([h, l]) => (
                <li key={h}><Link className="hover:text-paper" href={h}>{l}</Link></li>
              ))}
            </ul>
            <ul className="space-y-2 font-mono text-xs">
              {[["/status.json", "status.json"], ["/project.json", "project.json"], ["/llms.txt", "llms.txt"], ["/openapi.json", "openapi.json"], ["/docs/api", "API docs"]].map(([h, l]) => (
                <li key={h}><a className="hover:text-paper" href={h}>{l}</a></li>
              ))}
            </ul>
          </div>
        </footer>
      </body>
    </html>
  );
}
