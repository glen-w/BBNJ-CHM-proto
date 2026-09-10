/** Home welcome band — on until the visitor hides it. Not UI i18n. */
export const HOME_WELCOME_COOKIE = "chm_home_welcome";

/**
 * Cookie + role visibility for the home welcome band.
 * - Explicit off (`0` / `off` / `false`) always hides.
 * - Explicit on (`1` / `on` / `true`) always shows.
 * - Missing cookie: public / anonymous / STB / non-state → on;
 *   party or secretariat ops → off (Show welcome only).
 */
export function homeWelcomeVisible(
  value: string | undefined | null,
  opts?: { opsRole?: boolean },
): boolean {
  if (value === "0" || value === "off" || value === "false") return false;
  if (value === "1" || value === "on" || value === "true") return true;
  if (opts?.opsRole) return false;
  return true;
}

/** In-page jump targets for the welcome hero (CBD CHM-style). No map — charter forbids mandatory GIS. */
export const HOME_WELCOME_JUMPS = [
  { href: "#get-started", label: "Get started" },
  { href: "#recent-records", label: "Recent records" },
  { href: "/about", label: "About this desk" },
] as const;

export type HomeWelcomeSubmitMode = "party" | "offer" | "public";

export type HomeWelcomeLink = {
  href: string;
  label: string;
  external?: boolean;
};

export type HomeWelcomeCard = {
  key: "learn" | "search" | "submit";
  label: string;
  headerHref: string;
  links: HomeWelcomeLink[];
};

export function homeWelcomeSubmitMode(canSubmit: boolean, canSubmitCbtmtOffer: boolean): HomeWelcomeSubmitMode {
  if (canSubmit) return "party";
  if (canSubmitCbtmtOffer) return "offer";
  return "public";
}

/** LEARN / SEARCH / SUBMIT launchers — same shape as the CBD CHM “Get started” row. */
export function homeWelcomeGetStarted(mode: HomeWelcomeSubmitMode): HomeWelcomeCard[] {
  const submitLinks: HomeWelcomeLink[] =
    mode === "party"
      ? [
          { href: "/login", label: "Sign in" },
          { href: "/mgr/new", label: "Notify an MGR collection" },
          { href: "/about", label: "Help submitting records" },
        ]
      : mode === "offer"
        ? [
            { href: "/login", label: "Sign in" },
            { href: "/capacity", label: "Post a CBTMT offer" },
            { href: "/about", label: "Help submitting records" },
          ]
        : [
            { href: "/login", label: "Sign in" },
            { href: "/about", label: "Help submitting records" },
          ];

  return [
    {
      key: "learn",
      label: "Learn",
      headerHref: "/about",
      links: [
        { href: "/about", label: "Learn about the Cl-HM" },
        { href: "/settings?tab=demo", label: "Demo user path" },
        { href: "#journeys", label: "The four journeys" },
        { href: "https://www.un.org/bbnjagreement/en", label: "About the Agreement", external: true },
      ],
    },
    {
      key: "search",
      label: "Search",
      headerHref: "/search",
      links: [
        { href: "/search", label: "Search all records" },
        { href: "#journeys", label: "Filter a journey list" },
      ],
    },
    {
      key: "submit",
      label: "Submit",
      headerHref: mode === "party" ? "/mgr/new" : mode === "offer" ? "/capacity" : "/login",
      links: submitLinks,
    },
  ];
}
