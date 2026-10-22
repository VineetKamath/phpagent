// Every factual claim on the site must reference one of these.
// `verified: false` means the URL/claim has not yet been confirmed against the
// publisher by the maintainers; the UI renders such citations as VERIFYING.
export type Source = {
  id: string;
  title: string;
  publisher: string;
  publishedAt: string | null;
  url: string | null;
  type: "primary" | "vendor" | "research" | "government" | "statistic";
  accessedAt: string;
  verified: boolean;
  note?: string;
};

export const sources: Source[] = [
  {
    id: "php-releases",
    title: "PHP releases (JSON release index)",
    publisher: "The PHP Group",
    publishedAt: null,
    url: "https://www.php.net/releases/",
    type: "primary",
    accessedAt: "2026-10-22",
    verified: true,
    note: "Authoritative source for fixed versions. Queried live by the version database.",
  },
  {
    id: "php-changelog-8",
    title: "PHP 8 ChangeLog",
    publisher: "The PHP Group",
    publishedAt: null,
    url: "https://www.php.net/ChangeLog-8.php",
    type: "primary",
    accessedAt: "2026-10-22",
    verified: true,
  },
  {
    id: "php-supported",
    title: "Supported Versions",
    publisher: "The PHP Group",
    publishedAt: null,
    url: "https://www.php.net/supported-versions.php",
    type: "primary",
    accessedAt: "2026-10-22",
    verified: true,
  },
  {
    id: "php-src-advisories",
    title: "php/php-src security advisories",
    publisher: "GitHub / The PHP Group",
    publishedAt: null,
    url: "https://github.com/php/php-src/security/advisories",
    type: "primary",
    accessedAt: "2026-10-22",
    verified: true,
  },
  {
    id: "nvd-cve-2026-109618",
    title: "CVE-2026-109618",
    publisher: "NIST National Vulnerability Database",
    publishedAt: "2026-10-21",
    url: "https://nvd.nist.gov/vuln/detail/CVE-2026-109618",
    type: "government",
    accessedAt: "2026-10-22",
    verified: true,
    note: "Confirmed via NVD API 2.0 on 2026-10-22: CRITICAL, CVSS 9.2, published 2026-10-21.",
  },
  {
    id: "nvd-cve-2026-109619",
    title: "CVE-2026-109619",
    publisher: "NIST National Vulnerability Database",
    publishedAt: "2026-10-21",
    url: "https://nvd.nist.gov/vuln/detail/CVE-2026-109619",
    type: "government",
    accessedAt: "2026-10-22",
    verified: true,
    note: "Confirmed via NVD API 2.0 on 2026-10-22: CRITICAL, CVSS 9.2, published 2026-10-21.",
  },
  {
    id: "cisa-kev",
    title: "Known Exploited Vulnerabilities Catalog",
    publisher: "CISA",
    publishedAt: null,
    url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
    type: "government",
    accessedAt: "2026-10-22",
    verified: true,
  },
  {
    id: "w3techs-php",
    title: "Usage statistics of PHP for websites",
    publisher: "W3Techs",
    publishedAt: null,
    url: "https://w3techs.com/technologies/details/pl-php",
    type: "statistic",
    accessedAt: "2026-10-22",
    verified: true,
    note: "Measures the share of websites whose server-side language W3Techs can identify, not the share of the whole Internet.",
  },
  {
    id: "docker-php",
    title: "Docker Official Image: php",
    publisher: "Docker Hub",
    publishedAt: null,
    url: "https://hub.docker.com/_/php",
    type: "vendor",
    accessedAt: "2026-10-22",
    verified: true,
  },
  {
    id: "github-app-permissions",
    title: "Choosing permissions for a GitHub App",
    publisher: "GitHub Docs",
    publishedAt: null,
    url: "https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app",
    type: "vendor",
    accessedAt: "2026-10-22",
    verified: true,
  },
  {
    id: "research-pending",
    title: "Third-party research write-ups (Wiz, Calif, Cloudflare, OpenAI)",
    publisher: "Various",
    publishedAt: null,
    url: null,
    type: "research",
    accessedAt: "2026-10-22",
    verified: false,
    note: "Not linked until the maintainers confirm canonical URLs. Claims attributed to these parties are not made on this site until then.",
  },
];

export const sourceById = (id: string) => sources.find((s) => s.id === id);
