/**
 * SQLite DDL for the BBNJ Cl-HM prototype.
 * Pack status lives on events; domain records hold current stage.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  roles_json TEXT NOT NULL,
  party_code TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  themes_json TEXT NOT NULL DEFAULT '[]',
  abnj_boxes_json TEXT NOT NULL DEFAULT '[]',
  domains_json TEXT NOT NULL DEFAULT '[]',
  digest TEXT NOT NULL DEFAULT 'daily'
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  event_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  at TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  summary TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mint_counters (
  key TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  seq INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mgr_batches (
  id TEXT PRIMARY KEY,
  public_record_id TEXT,
  b_sbi TEXT,
  current_stage TEXT NOT NULL,
  party_code TEXT NOT NULL,
  title TEXT NOT NULL,
  location_hint TEXT,
  source_channel TEXT NOT NULL DEFAULT 'form',
  confidentiality TEXT NOT NULL DEFAULT 'public',
  version INTEGER NOT NULL DEFAULT 1,
  tk_fpic_flag INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS eia_activities (
  id TEXT PRIMARY KEY,
  public_record_id TEXT,
  current_stage TEXT NOT NULL,
  latest_pack_status TEXT,
  title TEXT NOT NULL,
  party_code TEXT NOT NULL,
  abnj_box TEXT NOT NULL,
  source_channel TEXT NOT NULL DEFAULT 'form',
  confidentiality TEXT NOT NULL DEFAULT 'public',
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cbtmt_needs (
  id TEXT PRIMARY KEY,
  public_record_id TEXT,
  title TEXT NOT NULL,
  themes_json TEXT NOT NULL DEFAULT '[]',
  party_code TEXT NOT NULL,
  source_channel TEXT NOT NULL DEFAULT 'form',
  confidentiality TEXT NOT NULL DEFAULT 'public',
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cbtmt_offers (
  id TEXT PRIMARY KEY,
  public_record_id TEXT,
  title TEXT NOT NULL,
  themes_json TEXT NOT NULL DEFAULT '[]',
  provider TEXT NOT NULL,
  source_channel TEXT NOT NULL DEFAULT 'form',
  confidentiality TEXT NOT NULL DEFAULT 'public',
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cbtmt_matches (
  id TEXT PRIMARY KEY,
  need_id TEXT NOT NULL REFERENCES cbtmt_needs(id),
  offer_id TEXT NOT NULL REFERENCES cbtmt_offers(id),
  rule TEXT NOT NULL,
  at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  record_id TEXT NOT NULL,
  public_record_id TEXT,
  receipt_id TEXT,
  related_record_id TEXT,
  status TEXT NOT NULL,
  stage TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  actor_user_id TEXT,
  at TEXT NOT NULL,
  summary TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  confidentiality TEXT NOT NULL DEFAULT 'public',
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_events_record ON events(record_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
`;
