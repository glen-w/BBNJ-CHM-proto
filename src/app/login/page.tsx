import { AppShell } from "@/components/app-shell";
import { roleLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RAIL_ICON } from "@/components/domain-icons";
import { flashFrom } from "@/components/flash";
import { SubmitButton } from "@/components/forms";
import { getDb } from "@/lib/db";
import { loginAction } from "@/server/actions";
import { getSessionUser } from "@/server/session";
import { listUsers } from "@/server/users";

const RolesIcon = RAIL_ICON.roles;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const BLURB: Record<string, string> = {
  "party.nfp": "Submits MGR notifications, EIA packs and capacity needs for Party XSD. Sees own drafts plus everything published.",
  secretariat: "Publishes records that are waiting, imports offline Excel, suggests matches, and sees the full audit.",
  public: "Read-only. Published, public-tier rows only — never drafts or pending packs.",
  stb: "Scientific and Technical Body reviewer. Sees published draft EIAs in a review queue and files one consolidated comment per version.",
  "nonstate.uploader":
    "Registered non-State provider. May post capacity-building offers only. Other actions are refused and recorded.",
};

export default async function LoginPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);
  const sp = await searchParams;
  const ret = typeof sp.return === "string" && sp.return.startsWith("/") ? sp.return : "/";
  const hintUser = typeof sp.user === "string" ? sp.user : undefined;
  const p = await getSessionUser();
  const users = listUsers(getDb());

  return (
    <AppShell title="Sign in" flash={flash}>
      <p className="max-w-3xl text-sm text-muted-foreground">
        Choose a role to continue.
        {p.kind === "user" ? (
          <>
            {" "}
            Currently <span className="font-mono">{p.user.username}</span>.
          </>
        ) : null}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {users.map((u) => (
          <form
            key={u.id}
            action={loginAction}
            className={cn(
              "flex flex-col justify-between rounded-lg border bg-card p-4",
              hintUser === u.username && "border-institutional ring-2 ring-institutional/30",
            )}
          >
            <input type="hidden" name="userId" value={u.id} />
            <input type="hidden" name="_return" value={ret} />
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-mono font-medium">
                  <RolesIcon aria-hidden="true" className="size-3.5 text-muted-foreground" />
                  {u.username}
                </span>
                <span className="rounded border border-line bg-muted px-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {u.roles.map(roleLabel).join(" · ")}
                </span>
              </div>
              <div className="mt-1 text-sm">{u.displayName}</div>
              <p className="mt-2 text-xs text-muted-foreground">{BLURB[u.username]}</p>
            </div>
            <SubmitButton size="sm" className="mt-4 self-start" variant={p.kind === "user" && p.user.id === u.id ? "secondary" : "default"}>
              {p.kind === "user" && p.user.id === u.id ? "Current" : `Sign in as ${u.username}`}
            </SubmitButton>
          </form>
        ))}
      </div>
    </AppShell>
  );
}
