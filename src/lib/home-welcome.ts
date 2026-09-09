/** Home welcome band — on until the visitor hides it. Not UI i18n. */
export const HOME_WELCOME_COOKIE = "chm_home_welcome";

/**
 * Shown when the cookie is missing (first visit / first compose up).
 * Only an explicit off value hides it; that hide is durable.
 */
export function homeWelcomeVisible(value: string | undefined | null): boolean {
  return value !== "0" && value !== "off" && value !== "false";
}

/** In-page jump targets for the welcome hero (CBD CHM-style). No map — charter forbids mandatory GIS. */
export const HOME_WELCOME_JUMPS = [
  { href: "#get-started", label: "Get started" },
  { href: "#recent-records", label: "Recent records" },
  { href: "#about-desk", label: "About this desk" },
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
          { href: "#about-desk", label: "Help submitting records" },
        ]
      : mode === "offer"
        ? [
            { href: "/login", label: "Sign in" },
            { href: "/capacity", label: "Post a CBTMT offer" },
            { href: "#about-desk", label: "Help submitting records" },
          ]
        : [
            { href: "/login", label: "Sign in" },
            { href: "#about-desk", label: "Help submitting records" },
          ];

  return [
    {
      key: "learn",
      label: "Learn",
      headerHref: "#about-desk",
      links: [
        { href: "#about-desk", label: "Learn about the Cl-HM" },
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
