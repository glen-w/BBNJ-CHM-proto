/**
 * SQLite DDL for the BBNJ Cl-HM prototype.
 *
 * Zod is the schema of record; SQL adds keys, uniqueness, checks and foreign keys
 * for every claimed invariant. No migrations: SCHEMA_VERSION mismatch refuses start.
 */
export const SCHEMA_VERSION = 6;

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
  -- Implementation (v4): amendment metadata for versions > 1 of a published pack.
  change_note TEXT,
  material_change INTEGER NOT NULL DEFAULT 0 CHECK (material_change IN (0, 1)),
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

-- Implementation (v4): every refused authorisation, append-only. Secretariat projection only.
CREATE TABLE IF NOT EXISTS access_refusals (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  domain TEXT,
  record_id TEXT,
  path TEXT,
  reason TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_refusals_at ON access_refusals(at);

-- Implementation (v4): durable outcome of one Excel import (closed loop for offline submitters).
CREATE TABLE IF NOT EXISTS import_runs (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  actor_user_id TEXT REFERENCES users(id),
  party_code TEXT NOT NULL,
  filename TEXT,
  bytes INTEGER NOT NULL,
  accepted INTEGER NOT NULL,
  rejected INTEGER NOT NULL,
  rows_json TEXT NOT NULL
);

-- Implementation (v4): one row per digest window delivered to a daily/weekly subscriber.
CREATE TABLE IF NOT EXISTS digest_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  at TEXT NOT NULL,
  event_count INTEGER NOT NULL,
  notification_id TEXT REFERENCES notifications(id),
  UNIQUE (user_id, window_end)
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
  -- Implementation (v4): previous Art 12.2 field values, one entry per superseded published version.
  details_history_json TEXT NOT NULL DEFAULT '[]',
  -- Implementation (v5): richer TK/FPIC metadata UX (no content store).
  tk_provenance_note TEXT,
  fpic_status_note TEXT,
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
  -- Implementation (v5): explicit comment-window due date (demo; Agreement fixes no day count).
  due_at TEXT,
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
  -- Implementation (v5): human facilitation note (brokerage pattern; not ML).
  facilitation_note TEXT,
  UNIQUE (need_id, offer_id),
  CHECK (need_id <> offer_id)
);

-- Implementation (v5): ABMT thin stub on the same pack rails (Art 51.3(a)(ii); without prejudice).
CREATE TABLE IF NOT EXISTS abmt_proposals (
  id TEXT PRIMARY KEY,
  public_record_id TEXT UNIQUE,
  current_stage TEXT NOT NULL DEFAULT 'proposal_stub' CHECK (current_stage = 'proposal_stub'),
  latest_pack_status TEXT CHECK (latest_pack_status IS NULL OR latest_pack_status IN ('draft', 'pending', 'published')),
  title TEXT NOT NULL,
  party_code TEXT NOT NULL,
  source_channel TEXT NOT NULL DEFAULT 'form' CHECK (source_channel IN ('form', 'excel', 'assisted')),
  confidentiality TEXT NOT NULL DEFAULT 'public' CHECK (confidentiality IN ('public', 'restricted', 'confidential')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  owner_user_id TEXT REFERENCES users(id),
  updated_at TEXT NOT NULL
);

-- Implementation (v6): SQLite FTS5 index for policy-aware record search (Session-1 search & retrieval).
-- Standalone content table kept in sync by triggers — no app-level reindex on write.
CREATE VIRTUAL TABLE IF NOT EXISTS records_fts USING fts5(
  domain UNINDEXED,
  record_id UNINDEXED,
  title,
  body,
  identifiers,
  tokenize = 'porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS mgr_batches_fts_ai AFTER INSERT ON mgr_batches BEGIN
  INSERT INTO records_fts(domain, record_id, title, body, identifiers)
  VALUES (
    'mgr',
    new.id,
    new.title,
    trim(coalesce(new.location_hint, '') || ' ' || coalesce(new.party_code, '')),
    trim(coalesce(new.public_record_id, '') || ' ' || coalesce(new.b_sbi, ''))
  );
END;
CREATE TRIGGER IF NOT EXISTS mgr_batches_fts_ad AFTER DELETE ON mgr_batches BEGIN
  DELETE FROM records_fts WHERE domain = 'mgr' AND record_id = old.id;
END;
CREATE TRIGGER IF NOT EXISTS mgr_batches_fts_au AFTER UPDATE ON mgr_batches BEGIN
  DELETE FROM records_fts WHERE domain = 'mgr' AND record_id = old.id;
  INSERT INTO records_fts(domain, record_id, title, body, identifiers)
  VALUES (
    'mgr',
    new.id,
    new.title,
    trim(coalesce(new.location_hint, '') || ' ' || coalesce(new.party_code, '')),
    trim(coalesce(new.public_record_id, '') || ' ' || coalesce(new.b_sbi, ''))
  );
END;

CREATE TRIGGER IF NOT EXISTS eia_activities_fts_ai AFTER INSERT ON eia_activities BEGIN
  INSERT INTO records_fts(domain, record_id, title, body, identifiers)
  VALUES (
    'eia',
    new.id,
    new.title,
    trim(coalesce(new.abnj_box, '') || ' ' || coalesce(new.party_code, '')),
    coalesce(new.public_record_id, '')
  );
END;
CREATE TRIGGER IF NOT EXISTS eia_activities_fts_ad AFTER DELETE ON eia_activities BEGIN
  DELETE FROM records_fts WHERE domain = 'eia' AND record_id = old.id;
END;
CREATE TRIGGER IF NOT EXISTS eia_activities_fts_au AFTER UPDATE ON eia_activities BEGIN
  DELETE FROM records_fts WHERE domain = 'eia' AND record_id = old.id;
  INSERT INTO records_fts(domain, record_id, title, body, identifiers)
  VALUES (
    'eia',
    new.id,
    new.title,
    trim(coalesce(new.abnj_box, '') || ' ' || coalesce(new.party_code, '')),
    coalesce(new.public_record_id, '')
  );
END;

CREATE TRIGGER IF NOT EXISTS cbtmt_records_fts_ai AFTER INSERT ON cbtmt_records BEGIN
  INSERT INTO records_fts(domain, record_id, title, body, identifiers)
  VALUES (
    'cbtmt',
    new.id,
    new.title,
    trim(
      replace(replace(replace(coalesce(new.themes_json, ''), '"', ' '), '[', ''), ']', '')
      || ' ' || coalesce(new.party_code, '')
      || ' ' || coalesce(new.provider, '')
    ),
    coalesce(new.public_record_id, '')
  );
END;
CREATE TRIGGER IF NOT EXISTS cbtmt_records_fts_ad AFTER DELETE ON cbtmt_records BEGIN
  DELETE FROM records_fts WHERE domain = 'cbtmt' AND record_id = old.id;
END;
CREATE TRIGGER IF NOT EXISTS cbtmt_records_fts_au AFTER UPDATE ON cbtmt_records BEGIN
  DELETE FROM records_fts WHERE domain = 'cbtmt' AND record_id = old.id;
  INSERT INTO records_fts(domain, record_id, title, body, identifiers)
  VALUES (
    'cbtmt',
    new.id,
    new.title,
    trim(
      replace(replace(replace(coalesce(new.themes_json, ''), '"', ' '), '[', ''), ']', '')
      || ' ' || coalesce(new.party_code, '')
      || ' ' || coalesce(new.provider, '')
    ),
    coalesce(new.public_record_id, '')
  );
END;

CREATE TRIGGER IF NOT EXISTS abmt_proposals_fts_ai AFTER INSERT ON abmt_proposals BEGIN
  INSERT INTO records_fts(domain, record_id, title, body, identifiers)
  VALUES (
    'abmt',
    new.id,
    new.title,
    coalesce(new.party_code, ''),
    coalesce(new.public_record_id, '')
  );
END;
CREATE TRIGGER IF NOT EXISTS abmt_proposals_fts_ad AFTER DELETE ON abmt_proposals BEGIN
  DELETE FROM records_fts WHERE domain = 'abmt' AND record_id = old.id;
END;
CREATE TRIGGER IF NOT EXISTS abmt_proposals_fts_au AFTER UPDATE ON abmt_proposals BEGIN
  DELETE FROM records_fts WHERE domain = 'abmt' AND record_id = old.id;
  INSERT INTO records_fts(domain, record_id, title, body, identifiers)
  VALUES (
    'abmt',
    new.id,
    new.title,
    coalesce(new.party_code, ''),
    coalesce(new.public_record_id, '')
  );
END;
`;
