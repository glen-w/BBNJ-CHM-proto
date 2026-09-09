"use server";

/**
 * Server Actions — thin adapters: FormData → domain call → revalidate → redirect.
 * Every action re-resolves the principal from the cookie; the domain layer
 * authorises. Domain errors surface as ?error= on the return page.
 * redirect() throws, so it is always called outside the try blocks.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { CONNECTION_PROFILE_IDS, isConnectionProfileId } from "@/lib/connection-profiles";
import { getDb } from "@/lib/db";
import { IdempotencyKey } from "@/lib/contracts/extensions";
import { FIELD_DEFS } from "@/lib/mgr-fields";
import { createAbmtProposal, submitAbmtProposal } from "./abmt";
import { createCbtmtRecord, setMatchFacilitationNote, suggestMatch, suggestMatches } from "./cbtmt";
import { runDigests } from "./digest";
import { addEiaPack, commentStb, createEiaActivity, setEiaDueAt } from "./eia";
import { DomainError } from "./errors";
import { importEiaScreeningExcel, importMgrExcel } from "./import";
import { addMgrPack, amendMgrPack, MGR_AMENDABLE_STAGES, saveMgrDraft, submitPreCollection } from "./mgr";
import { amendPack, publishPack } from "./packs";
import { getSubscription, markAllRead, upsertSubscription } from "./queries";
import { resetSandbox } from "./reset";
import { getSessionUser, setHomeWelcome, setSessionUser, setTreatyLang } from "./session";
import { appendSpeedTrials, runSpeedMatrix } from "./speed-lab";
import { buildEiaScreeningSample, buildMgrSample } from "./template";
import { findUserById } from "./users";

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

function keyOf(fd: FormData): string {
  const parsed = IdempotencyKey.safeParse(str(fd, "_key"));
  if (!parsed.success) throw new DomainError("validation", "Missing idempotency key — reload the form");
  return parsed.data;
}

function returnTo(fd: FormData, fallback: string): string {
  const r = str(fd, "_return");
  return r.startsWith("/") ? r : fallback;
}

function errorMessage(err: unknown): string {
  if (err instanceof DomainError) {
    if (err.details && Array.isArray(err.details)) {
      return `${err.message}: ${(err.details as { path: unknown[]; message: string }[]).map((i) => `${i.path.join(".")} — ${i.message}`).join("; ")}`;
    }
    return err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

type Outcome = { to: string; notice?: string; error?: string };

function finish(o: Outcome): never {
  if (!o.error) revalidatePath("/", "layout");
  const url = new URL(o.to, "http://x");
  if (o.notice) url.searchParams.set("notice", o.notice.slice(0, 300));
  if (o.error) url.searchParams.set("error", o.error.slice(0, 500));
  redirect(url.pathname + url.search);
}

/** Run a domain call; map success/failure to a redirect target. */
function attempt(back: string, fn: () => Outcome): never {
  let out: Outcome;
  try {
    out = fn();
  } catch (e) {
    out = { to: back, error: errorMessage(e) };
  }
  finish(out);
}

async function attemptAsync(back: string, fn: () => Promise<Outcome>): Promise<never> {
  let out: Outcome;
  try {
    out = await fn();
  } catch (e) {
    out = { to: back, error: errorMessage(e) };
  }
  finish(out);
}

// ------------------------------------------------------------------ session

export async function loginAction(fd: FormData) {
  const id = str(fd, "userId");
  const user = id ? findUserById(getDb(), id) : undefined;
  await setSessionUser(user && user.active ? user.id : null);
  finish({ to: returnTo(fd, "/"), notice: user ? `Signed in as ${user.username}` : "Signed out" });
}

/** Persist treaty-text language; UI strings stay English. */
export async function setTreatyLangAction(code: string) {
  await setTreatyLang(code);
  revalidatePath("/", "layout");
}

/** Show or hide the Home welcome band. Defaults on; no flash. */
export async function setHomeWelcomeAction(formData: FormData) {
  await setHomeWelcome(str(formData, "show") !== "0");
  revalidatePath("/");
}

export async function logoutAction() {
  await setSessionUser(null);
  finish({ to: "/", notice: "Signed out — you now see the public view" });
}

// ------------------------------------------------------------------ MGR

function mgrFields(fd: FormData): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const f of FIELD_DEFS) raw[f.key] = f.kind === "boolean" ? fd.get(f.key) !== null : str(fd, f.key);
  return raw;
}

export async function saveMgrDraftAction(fd: FormData) {
  const p = await getSessionUser();
  attempt(returnTo(fd, "/mgr/new"), () => {
    const batchId = str(fd, "batchId") || undefined;
    const r = saveMgrDraft(getDb(), p, mgrFields(fd), keyOf(fd), { batchId, partyCode: str(fd, "partyCode") || undefined });
    return { to: `/mgr/${r.batch.id}`, notice: "Draft saved — no B-SBI is issued until the notification is submitted." };
  });
}

export async function submitMgrAction(fd: FormData) {
  const p = await getSessionUser();
  attempt(returnTo(fd, "/mgr/new"), () => {
    const db = getDb();
    const key = keyOf(fd);
    let batchId = str(fd, "batchId");
    if (!batchId) {
      // no prior draft: create the draft and submit it on the same batch → one B-SBI
      batchId = saveMgrDraft(db, p, mgrFields(fd), `${key}:draft`, { partyCode: str(fd, "partyCode") || undefined }).batch.id;
    }
    const r = submitPreCollection(db, p, batchId, mgrFields(fd), key);
    return { to: `/mgr/${r.batch.id}`, notice: `Receipt ${r.event.receiptId} accepted — B-SBI ${r.batch.bSbi} issued (Art 12).` };
  });
}

export async function addMgrPackAction(fd: FormData) {
  const p = await getSessionUser();
  const batchId = str(fd, "batchId");
  attempt(`/mgr/${batchId}`, () => {
    const stage = z.enum(["post_collection", "utilisation"]).parse(str(fd, "stage"));
    addMgrPack(getDb(), p, batchId, stage, str(fd, "summary"), keyOf(fd));
    return { to: `/mgr/${batchId}`, notice: `${stage.replace("_", "-")} pack submitted (pending Secretariat publication).` };
  });
}

export async function importMgrAction(fd: FormData) {
  const p = await getSessionUser();
  await attemptAsync("/mgr/import", async () => {
    const file = fd.get("file");
    const useFixture = str(fd, "fixture") === "1";
    let bytes: Buffer;
    let filename: string | undefined;
    if (useFixture || !(file instanceof File) || file.size === 0) {
      // The bundled fixture deliberately includes one invalid row so the closed loop (error report → fix → re-import) is visible.
      bytes = await buildMgrSample({ withInvalid: true });
      filename = "fixture:mgr-sample.xlsx";
    } else {
      if (!file.name.toLowerCase().endsWith(".xlsx")) throw new DomainError("import_rejected", "Only .xlsx files are accepted");
      bytes = Buffer.from(await file.arrayBuffer());
      filename = file.name;
    }
    const res = await importMgrExcel(getDb(), p, bytes, str(fd, "partyCode") || "XSD", keyOf(fd), { filename });
    return {
      to: `/mgr/import/${res.runId}`,
      notice: `${res.accepted} accepted, ${res.rejected} rejected${res.rejected ? " — download the error report, fix the rows, re-import" : ""}`,
    };
  });
}

/**
 * Speed lab: run the closed loop under the ticked connection profiles (default: all),
 * log the trials to data/speed-runs.jsonl. Writes nothing to SQLite.
 */
export async function runSpeedTrialAction(fd: FormData) {
  const p = await getSessionUser();
  await attemptAsync("/lab/speed", async () => {
    const picked = fd.getAll("profile").filter(isConnectionProfileId);
    const profiles = picked.length ? CONNECTION_PROFILE_IDS.filter((id) => picked.includes(id)) : CONNECTION_PROFILE_IDS;
    const trials = await runSpeedMatrix(p, profiles, { db: getDb() });
    appendSpeedTrials(trials);
    return { to: "/lab/speed", notice: `${trials.length} trials logged for ${profiles.length} profile${profiles.length === 1 ? "" : "s"} — mocked transfer, measured parse.` };
  });
}

// ------------------------------------------------------------------ amend (all domains)

export async function amendAction(fd: FormData) {
  const p = await getSessionUser();
  const back = returnTo(fd, "/");
  attempt(back, () => {
    const domain = z.enum(["mgr", "eia", "cbtmt"]).parse(str(fd, "domain"));
    const recordId = str(fd, "recordId");
    const stage = str(fd, "stage");
    const changeNote = str(fd, "changeNote");
    const materialChange = fd.get("materialChange") !== null;
    const summary = str(fd, "summary");
    const key = keyOf(fd);
    let version: number;
    if (domain === "mgr") {
      const st = z.enum(MGR_AMENDABLE_STAGES).parse(stage);
      const fieldEdits: Record<string, unknown> = {};
      if (st === "pre_collection" && str(fd, "_withFields") === "1") Object.assign(fieldEdits, mgrFields(fd));
      version = amendMgrPack(getDb(), p, recordId, st, { summary, changeNote, materialChange, fieldEdits }, key).event.version;
    } else {
      version = amendPack(getDb(), p, { domain, recordId, stage, summary, changeNote, materialChange, idempotencyKey: key }).event.version;
    }
    return {
      to: back,
      notice: `Amendment recorded as ${stage.replace(/_/g, " ")} v${version} (pending). ${materialChange ? "Material change: earlier readers will be re-notified on publication." : "Editorial change: subscribers only."} Identifiers unchanged.`,
    };
  });
}

// ------------------------------------------------------------------ digest / sandbox (Secretariat)

export async function runDigestAction(fd: FormData) {
  const p = await getSessionUser();
  const back = returnTo(fd, "/notifications");
  attempt(back, () => {
    const cadence = z.enum(["daily", "weekly"]).optional().catch(undefined).parse(str(fd, "cadence") || undefined);
    const r = runDigests(getDb(), { actor: p, cadence });
    const written = r.users.filter((u) => u.inserted).map((u) => `${u.username} (${u.eventCount})`);
    return {
      to: back,
      notice: r.inserted
        ? `Digest run: ${r.inserted} digest${r.inserted === 1 ? "" : "s"} written to the in-app bell (no e-mail in this build) — ${written.join(", ")}.`
        : "Digest run: nothing new held for any daily/weekly subscriber.",
    };
  });
}

export async function resetSandboxAction(fd: FormData) {
  const p = await getSessionUser();
  const back = returnTo(fd, "/audit");
  attempt(back, () => {
    const r = resetSandbox(p);
    return { to: "/", notice: `Database reset and re-seeded (${r.removed.length} file(s) removed). Sign-ins survive; everything else is fresh.` };
  });
}

// ------------------------------------------------------------------ publish (all domains)

export async function publishAction(fd: FormData) {
  const p = await getSessionUser();
  const back = returnTo(fd, "/");
  attempt(back, () => {
    const domain = z.enum(["mgr", "eia", "cbtmt", "abmt"]).parse(str(fd, "domain"));
    const ev = str(fd, "expectedVersion");
    const stage = str(fd, "stage");
    const r = publishPack(getDb(), p, { domain, recordId: str(fd, "recordId"), stage, expectedVersion: ev ? Number(ev) : undefined });
    return {
      to: back,
      notice: r.created ? `Published ${stage.replace(/_/g, " ")} v${r.event.version} — ${r.event.publicRecordId}. Subscribers notified.` : "Already published — nothing changed.",
    };
  });
}

// ------------------------------------------------------------------ EIA

export async function createEiaAction(fd: FormData) {
  const p = await getSessionUser();
  attempt("/eia/new", () => {
    const r = createEiaActivity(
      getDb(),
      p,
      {
        title: str(fd, "title"),
        abnjBox: str(fd, "abnjBox"),
        partyCode: str(fd, "partyCode") || undefined,
        confidentiality: z.enum(["public", "restricted", "confidential"]).catch("public").parse(str(fd, "confidentiality")),
      },
      keyOf(fd),
    );
    return { to: `/eia/${r.activity.id}`, notice: "Activity created with a draft screening pack." };
  });
}

export async function addEiaPackAction(fd: FormData) {
  const p = await getSessionUser();
  const activityId = str(fd, "activityId");
  attempt(`/eia/${activityId}`, () => {
    const stage = str(fd, "stage");
    const outcome = str(fd, "screeningOutcome");
    addEiaPack(getDb(), p, activityId, stage, str(fd, "summary"), keyOf(fd), {
      screeningOutcome: outcome ? z.enum(["eia_required", "no_eia"]).parse(outcome) : undefined,
    });
    return { to: `/eia/${activityId}`, notice: `${stage.replace(/_/g, " ")} pack submitted (pending).` };
  });
}

/** Set or clear the explicit comment-window due date on an activity (P1). */
export async function setEiaDueAtAction(fd: FormData) {
  const p = await getSessionUser();
  const activityId = str(fd, "activityId");
  const back = returnTo(fd, `/eia/${activityId}`);
  attempt(back, () => {
    const raw = str(fd, "dueAt").trim();
    let dueAt: string | null = null;
    if (raw) {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) throw new DomainError("validation", "Due date must be a valid date");
      dueAt = d.toISOString();
    }
    setEiaDueAt(getDb(), p, activityId, dueAt);
    return { to: back, notice: dueAt ? `Due date set to ${dueAt.slice(0, 10)} (demo value — the Agreement fixes no day count).` : "Due date cleared." };
  });
}

export async function importEiaAction(fd: FormData) {
  const p = await getSessionUser();
  await attemptAsync("/eia/import", async () => {
    const file = fd.get("file");
    const useFixture = str(fd, "fixture") === "1";
    let bytes: Buffer;
    let filename: string | undefined;
    if (useFixture || !(file instanceof File) || file.size === 0) {
      bytes = await buildEiaScreeningSample({ withInvalid: true });
      filename = "fixture:eia-screening-sample.xlsx";
    } else {
      if (!file.name.toLowerCase().endsWith(".xlsx")) throw new DomainError("import_rejected", "Only .xlsx files are accepted");
      bytes = Buffer.from(await file.arrayBuffer());
      filename = file.name;
    }
    const res = await importEiaScreeningExcel(getDb(), p, bytes, str(fd, "partyCode") || "XSD", keyOf(fd), { filename });
    return {
      to: `/eia/import/${res.runId}`,
      notice: `${res.accepted} accepted, ${res.rejected} rejected${res.rejected ? " — download the error report, fix the rows, re-import" : ""}`,
    };
  });
}

/** Same as importEiaAction with the bundled fixture forced (mirror of the MGR sample path). */
export async function importEiaSampleAction(fd: FormData) {
  fd.set("fixture", "1");
  await importEiaAction(fd);
}

export async function commentStbAction(fd: FormData) {
  const p = await getSessionUser();
  attempt("/stb", () => {
    commentStb(getDb(), p, str(fd, "activityId"), str(fd, "text"), keyOf(fd));
    return { to: "/stb", notice: "Consolidated STB comment recorded as a published comments_stb pack." };
  });
}

// ------------------------------------------------------------------ CBTMT

export async function createCbtmtAction(fd: FormData) {
  const p = await getSessionUser();
  attempt("/capacity", () => {
    const kind = z.enum(["need", "offer"]).parse(str(fd, "kind"));
    createCbtmtRecord(
      getDb(),
      p,
      {
        kind,
        title: str(fd, "title"),
        themes: str(fd, "themes"),
        partyCode: str(fd, "partyCode") || undefined,
        provider: str(fd, "provider") || undefined,
        confidentiality: z.enum(["public", "restricted", "confidential"]).catch("public").parse(str(fd, "confidentiality")),
      },
      keyOf(fd),
    );
    return { to: "/capacity", notice: `${kind === "need" ? "Need" : "Offer"} posted (pending publication).` };
  });
}

export async function suggestMatchAction(fd: FormData) {
  const p = await getSessionUser();
  attempt("/capacity", () => {
    const r = suggestMatch(getDb(), p, str(fd, "needId"), str(fd, "offerId"), str(fd, "rule") || "manual", keyOf(fd));
    return { to: "/capacity", notice: r.created ? "Match row inserted and match_suggested event published." : "That need/offer pair is already matched." };
  });
}

export async function suggestMatchesAction(fd: FormData) {
  const p = await getSessionUser();
  attempt("/capacity", () => {
    const r = suggestMatches(getDb(), p, keyOf(fd));
    return { to: "/capacity", notice: `Shared-theme rule: ${r.length} pair(s) evaluated, ${r.filter((m) => m.created).length} new match(es).` };
  });
}

/** Secretariat facilitation note on a match — human brokerage pattern beside the deterministic rule. */
export async function setFacilitationNoteAction(fd: FormData) {
  const p = await getSessionUser();
  const back = returnTo(fd, "/capacity");
  attempt(back, () => {
    setMatchFacilitationNote(getDb(), p, str(fd, "matchId"), str(fd, "note"));
    return { to: back, notice: "Facilitation note recorded on the match (no event, no notification — a human annotation only)." };
  });
}

// ------------------------------------------------------------------ ABMT (thin stub; without prejudice to COP1)

export async function createAbmtAction(fd: FormData) {
  const p = await getSessionUser();
  attempt("/abmt/new", () => {
    const r = createAbmtProposal(
      getDb(),
      p,
      {
        title: str(fd, "title"),
        partyCode: str(fd, "partyCode") || undefined,
        confidentiality: z.enum(["public", "restricted", "confidential"]).catch("public").parse(str(fd, "confidentiality")),
      },
      keyOf(fd),
    );
    return { to: `/abmt/${r.proposal.id}`, notice: "ABMT proposal stub opened as a draft (Art 51.3(a)(ii); without prejudice to COP1)." };
  });
}

export async function submitAbmtAction(fd: FormData) {
  const p = await getSessionUser();
  const proposalId = str(fd, "proposalId");
  attempt(`/abmt/${proposalId}`, () => {
    const r = submitAbmtProposal(getDb(), p, proposalId, keyOf(fd));
    return { to: `/abmt/${proposalId}`, notice: `Receipt ${r.event.receiptId ?? "—"} — proposal stub pending Secretariat publication.` };
  });
}

// ------------------------------------------------------------------ notifications / preferences

export async function markAllReadAction(fd: FormData) {
  const p = await getSessionUser();
  markAllRead(getDb(), p);
  finish({ to: returnTo(fd, "/notifications") });
}

export async function savePreferencesAction(fd: FormData) {
  const p = await getSessionUser();
  attempt("/preferences", () => {
    if (p.kind !== "user") throw new DomainError("forbidden", "Sign in to manage subscriptions");
    const db = getDb();
    const existing = getSubscription(db, p);
    const list = (k: string) => fd.getAll(k).map(String).filter(Boolean);
    upsertSubscription(db, {
      id: existing?.id ?? crypto.randomUUID(),
      userId: p.user.id,
      domains: z.array(z.enum(["mgr", "eia", "cbtmt", "abmt"])).parse(list("domains")),
      abnjBoxes: list("abnjBoxes"),
      themes: list("themes"),
      digest: z.enum(["immediate", "daily", "weekly"]).catch("daily").parse(str(fd, "digest")),
    });
    return { to: "/preferences", notice: "Subscription saved. Future published packs matching these filters reach your bell." };
  });
}
