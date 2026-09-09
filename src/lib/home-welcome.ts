/** Home welcome band — on until the visitor hides it. Not UI i18n. */
export const HOME_WELCOME_COOKIE = "chm_home_welcome";

/**
 * Shown when the cookie is missing (first visit / first compose up).
 * Only an explicit off value hides it; that hide is durable.
 */
export function homeWelcomeVisible(value: string | undefined | null): boolean {
  return value !== "0" && value !== "off" && value !== "false";
}
