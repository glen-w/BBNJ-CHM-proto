/**
 * SQLite DDL for the BBNJ Cl-HM prototype.
 *
 * Zod is the schema of record; SQL adds keys, uniqueness, checks and foreign keys
 * for every claimed invariant. No migrations: SCHEMA_VERSION mismatch refuses start.
 */
export const SCHEMA_VERSION = 3;

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  roles_json TEXT NOT NULL,
  party_code TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  themes_json TEXT NOT NULL DEFAULT '[]',
  abnj_boxes_json TEXT NOT NULL DEFAULT '[]',
  domains_json TEXT NOT NULL DEFAULT '[]',
  digest TEXT NOT NULL DEFAULT 'daily' CHECK (digest IN ('immediate', 'daily', 'weekly'))
);

-- Append-only outbox. One table for the discriminated union.
CREATE TABLE IF NOT EXISTS events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL CHECK (domain IN ('mgr', 'cbtmt', 'eia', 'abmt')),
  stage TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'pending', 'published')),
  record_id TEXT NOT NULL,
  related_record_id TEXT,
  public_record_id TEXT,
  receipt_id TEXT,
  actor_role TEXT NOT NULL,
  actor_user_id TEXT,
  at TEXT NOT NULL,
  summary TEXT NOT NULL,
  artifact_refs_json TEXT NOT NULL DEFAULT '[]',
  confidentiality TEXT NOT NULL DEFAULT 'public' CHECK (confidentiality IN ('public', 'restricted', 'confidential')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  b_sbi TEXT,
  match_id TEXT,
  screening_outcome TEXT CHECK (screening_outcome IS NULL OR screening_outcome IN ('eia_required', 'no_eia')),
  idempotency_key TEXT UNIQUE,
  UNIQUE (record_id, stage, version, status)
);
CREATE INDEX IF NOT EXISTS idx_events_pack ON events(record_id, stage, version, seq);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status, domain, confidentiality);
CREATE INDEX IF NOT EXISTS idx_events_prid ON events(public_record_id);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  event_id TEXT NOT NULL REFERENCES events(id),
  kind TEXT NOT NULL CHECK (kind IN ('publish', 'deadline', 'digest', 'match', 'stb_review')),
  at TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0 CHECK (read IN (0, 1)),
  summary TEXT NOT NULL,
  UNIQUE (user_id, event_id, kind)
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, at);

-- Implementation table: delivery outcome per dispatched event (events stay immutable).
CREATE TABLE IF NOT EXISTS dispatch_log (
  event_id TEXT PRIMARY KEY REFERENCES events(id),
  at TEXT NOT NULL,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  error TEXT
);

CREATE TABLE IF NOT EXISTS counters (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mgr_batches (
  id TEXT PRIMARY KEY,
  public_record_id TEXT UNIQUE,
  b_sbi TEXT UNIQUE,
  current_stage TEXT NOT NULL CHECK (current_stage IN ('pre_collection', 'batch_id_issued', 'post_collection', 'utilisation')),
  party_code TEXT NOT NULL,
  title TEXT NOT NULL,
  location_hint TEXT,
  source_channel TEXT NOT NULL DEFAULT 'form' CHECK (source_channel IN ('form', 'excel', 'assisted')),
  confidentiality TEXT NOT NULL DEFAULT 'public' CHECK (confidentiality IN ('public', 'restricted', 'confidential')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  tk_fpic_flag INTEGER NOT NULL DEFAULT 0 CHECK (tk_fpic_flag IN (0, 1)),
  owner_user_id TEXT REFERENCES users(id),
  details_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  -- C1: B-SBI exists exactly when the batch has left pre_collection (one mint, at receipt).
  CHECK ((b_sbi IS NULL) = (current_stage = 'pre_collection'))
);

CREATE TABLE IF NOT EXISTS eia_activities (
  id TEXT PRIMARY KEY,
  public_record_id TEXT UNIQUE,
  current_stage TEXT NOT NULL,
  latest_pack_status TEXT CHECK (latest_pack_status IS NULL OR latest_pack_status IN ('draft', 'pending', 'published')),
  title TEXT NOT NULL,
  party_code TEXT NOT NULL,
  abnj_box TEXT NOT NULL,
  source_channel TEXT NOT NULL DEFAULT 'form' CHECK (source_channel IN ('form', 'excel', 'assisted')),
  confidentiality TEXT NOT NULL DEFAULT 'public' CHECK (confidentiality IN ('public', 'restricted', 'confidential')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  owner_user_id TEXT REFERENCES users(id),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cbtmt_records (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('need', 'offer')),
  public_record_id TEXT UNIQUE,
  stage TEXT NOT NULL CHECK (stage IN ('need_posted', 'offer_posted')),
  title TEXT NOT NULL,
  themes_json TEXT NOT NULL DEFAULT '[]',
  party_code TEXT,
  provider TEXT,
  source_channel TEXT NOT NULL DEFAULT 'form' CHECK (source_channel IN ('form', 'excel', 'assisted')),
  confidentiality TEXT NOT NULL DEFAULT 'public' CHECK (confidentiality IN ('public', 'restricted', 'confidential')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  owner_user_id TEXT REFERENCES users(id),
  updated_at TEXT NOT NULL,
  CHECK ((kind = 'need' AND party_code IS NOT NULL) OR (kind = 'offer' AND provider IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS cbtmt_matches (
  id TEXT PRIMARY KEY,
  need_id TEXT NOT NULL REFERENCES cbtmt_records(id),
  offer_id TEXT NOT NULL REFERENCES cbtmt_records(id),
  rule TEXT NOT NULL,
  at TEXT NOT NULL,
  UNIQUE (need_id, offer_id),
  CHECK (need_id <> offer_id)
);
`;
