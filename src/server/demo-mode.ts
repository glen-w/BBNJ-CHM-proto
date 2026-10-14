/**
 * Hosted participant URL: keep passwordless role logins and read visibility,
 * but refuse desk mutations. Presenter runs locally with this unset.
 */
type Env = Record<string, string | undefined>;

const WRITE_ACTIONS = new Set([
  "submit",
  "amend",
  "publish",
  "comment_stb",
  "import",
  "suggest_match",
  "manage_subscription",
  "run_digest",
  "reset_sandbox",
]);

export function readOnlyDemoEnabled(env: Env = process.env): boolean {
  return env.READ_ONLY_DEMO === "1";
}

/** Mutations blocked on the public demo; role-based reads (audit, exports) still allowed. */
export function readOnlyDemoBlocksAction(action: string): boolean {
  return WRITE_ACTIONS.has(action);
}
