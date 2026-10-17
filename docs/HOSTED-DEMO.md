# Hosted public demo (optional)

The default way to try this prototype is **local**: `npm ci && npm run db:seed && npm run dev`, or `docker compose up --build`. There is **no** always-on public URL maintained by the project.

If you need a **shared link** for a webinar, reviewer cohort, or short evaluation window, you can deploy the same Docker image to a small host. This repo includes a working **[Fly.io](https://fly.io)** configuration (`fly.toml`) used previously for that purpose. Any similar PaaS (Railway, Render, a VPS with Docker) follows the same ideas: one process, one SQLite file on a persistent volume, secrets for the perimeter gate.

**Not a production deployment.** Cookie logins are passwordless, the desk is a sandbox, and SQLite does not scale to multiple machines on one file. Treat a public URL as a **time-boxed demo**, not an operational CHM.

---

## Recommended split: presenter vs participants

| Who | Where | Settings |
|-----|--------|----------|
| **Presenter** (live submit / publish / import) | Your laptop or a **private** deploy | Full writes; **do not** set `READ_ONLY_DEMO=1` |
| **Participants** (browse each role, no mutations) | Shared public URL | `READ_ONLY_DEMO=1` — five logins still work; writes are refused and logged |

Details and talk-track: local `internal/presenter/DEMO-SCRIPT.md` (gitignored; restore via `npm run internal:restore` on a fresh clone).

---

## Security before you go public

1. **HTTP Basic gate (required on any public URL).** Set `SANDBOX_BASIC_PASSWORD` (and optionally `SANDBOX_BASIC_USER`, default `bbnj`) as a **secret**, not in git. The gate is implemented in `src/proxy.ts`; it is **off** when the password is unset — fine for localhost, unsafe on the internet.
2. **Share Basic credentials** with reviewers only (e.g. user `bbnj` + password). That is separate from the five desk cookies at `/login`.
3. **`SANDBOX_RESET=force`** (as in `fly.toml`) exposes Secretariat *Reset database* to anyone who passes Basic **and** can use the `secretariat` cookie. Acceptable for a controlled sandbox; do not use for real data.
4. **`/api/health`** bypasses Basic so load balancers can probe; it returns table names and the database path — keep that in mind for threat modelling.

---

## Deploy on Fly.io (reference path)

Prerequisites: [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/) installed and `fly auth login`.

### 1. Create the app (once)

Pick an app name (or keep the sample name in `fly.toml` if unused):

```bash
fly apps create bbnj-chm   # skip if the name in fly.toml is already yours
```

### 2. Set secrets (required)

```bash
fly secrets set SANDBOX_BASIC_PASSWORD='choose-a-strong-password'
```

Optional: override the Basic user (default `bbnj` is already in `[env]` in `fly.toml`):

```bash
fly secrets set SANDBOX_BASIC_USER='bbnj'
```

### 3. Deploy

From the repository root:

```bash
fly deploy
```

The `Dockerfile` builds the Next.js app, runs `npm run db:seed -- --if-empty` on start, and listens on `PORT` (3000). `fly.toml` mounts a volume at `/app/data` for `chm.sqlite`.

On first deploy, Fly creates the volume (`chm_data`, region `cdg` in the checked-in config — change `primary_region` / volume region if you prefer).

### 4. Smoke-check

```bash
fly open
```

You should get a browser Basic prompt, then the desk. Sign in at `/login` with `party.nfp` or `secretariat` (no passwords on desk logins).

Health (no Basic): `https://<your-app>.fly.dev/api/health`

### 5. Custom hostname (optional)

```bash
fly certs add demo.example.org
```

Point DNS at Fly as instructed, then use that URL in slides. A previous demo used `bbnj-chm.glenwright.earth`; that app was **retired** in October 2026 — the config remains as a template only.

---

## Environment variables (hosted)

| Variable | Typical hosted value | Purpose |
|----------|----------------------|---------|
| `DATABASE_PATH` | `/app/data/chm.sqlite` | SQLite on the volume |
| `SANDBOX_BASIC_PASSWORD` | **secret** | Browser Basic gate |
| `SANDBOX_BASIC_USER` | `bbnj` | Basic username |
| `READ_ONLY_DEMO` | `1` | Participant URL: browse roles, refuse writes |
| `SANDBOX_RESET` | `force` | Allow Secretariat reset in production image |
| `PORT` / `HOSTNAME` | `3000` / `0.0.0.0` | Process bind (set in `fly.toml`) |

Local development: omit Basic password and `READ_ONLY_DEMO` unless you are explicitly testing hosted behaviour.

---

## Schema upgrades and data loss

The database is **schema version 7**. If a pull bumps the version, an old volume throws `SchemaVersionError` on start. For a disposable sandbox, delete the SQLite file on the volume (or destroy and recreate the volume) and redeploy so `--if-empty` seeds again. **Any edits participants made on the hosted instance are lost.** Plan schema upgrades between demo windows, not mid-webinar.

---

## Tear down

When the demo window ends:

```bash
fly apps destroy bbnj-chm   # destroys app, machines, and attached volumes
```

Remove DNS records for any custom hostname you added.

---

## Other hosts

- **Docker on a VPS:** run the same image with a bind mount or named volume for `/app/data`, publish 443 via your reverse proxy, inject the same env vars and Basic auth at the proxy if you prefer not to use the built-in gate.
- **docker compose locally:** published on `127.0.0.1` only by default — not a public demo without extra networking and auth.

For funded operational deployment (Postgres, object store, SMTP, identity provider), see [`ROADMAP.md`](ROADMAP.md) — that is out of scope for this prototype path.
