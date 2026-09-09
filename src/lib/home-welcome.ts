/** Home welcome band — cookie preference, on by default. Not UI i18n. */
export const HOME_WELCOME_COOKIE = "chm_home_welcome";

/** Missing or unknown values show the band. Only an explicit off value hides it. */
export function homeWelcomeVisible(value: string | undefined | null): boolean {
  return value !== "0" && value !== "off" && value !== "false";
}
