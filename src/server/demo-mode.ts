/**
 * Hosted participant URL: force anonymous public view and refuse mutations.
 * Presenter runs locally with this unset (full cookie roles).
 */
type Env = Record<string, string | undefined>;

export function readOnlyDemoEnabled(env: Env = process.env): boolean {
  return env.READ_ONLY_DEMO === "1";
}
