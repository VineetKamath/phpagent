import type { MetadataRoute } from "next";
import { brand } from "@/content/brand";
import { php2shell } from "@/content/php2shell";

const routes = ["/", "/live", "/architecture", "/patches", "/check", "/research/php2shell", "/whitepaper", "/proof", "/status", "/treasury", "/protect", "/security", "/methodology", "/sources", "/docs/api"];

export default function sitemap(): MetadataRoute.Sitemap {
  return [...routes, ...php2shell.cves.map((c) => `/cve/${c.id}`)].map((r) => ({ url: new URL(r, brand.siteUrl).toString(), lastModified: new Date() }));
}
