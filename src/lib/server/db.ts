import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Durable content store. Uses Node's built-in SQLite so no native add-on is
 * required; the data directory (database + uploaded media) is meant to live on
 * persistent host storage (D-03) and survives restarts (SC-23).
 */
export const DATA_DIR = resolve(process.env.PORTFOLIO_DATA ?? 'data');
export const MEDIA_DIR = resolve(DATA_DIR, 'media');

mkdirSync(MEDIA_DIR, { recursive: true });

export const db = new DatabaseSync(resolve(DATA_DIR, 'notebook.sqlite'));
db.exec('PRAGMA journal_mode=WAL;');
db.exec('PRAGMA foreign_keys=ON;');
db.exec(`
CREATE TABLE IF NOT EXISTS owners (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('project','article')),
  created_at TEXT NOT NULL,
  draft_version INTEGER NOT NULL DEFAULT 1,
  draft_updated_at TEXT,
  d_title TEXT NOT NULL DEFAULT '',
  d_slug TEXT NOT NULL DEFAULT '',
  d_url TEXT NOT NULL DEFAULT '',
  d_description TEXT NOT NULL DEFAULT '',
  d_alt TEXT NOT NULL DEFAULT '',
  d_photo_id TEXT,
  d_crop TEXT,
  d_case_study TEXT,
  d_excerpt TEXT NOT NULL DEFAULT '',
  d_source TEXT,
  d_cover_id TEXT,
  pub_version INTEGER,
  first_published_at TEXT,
  published_updated_at TEXT,
  p_title TEXT,
  p_slug TEXT,
  p_url TEXT,
  p_description TEXT,
  p_alt TEXT,
  p_photo_id TEXT,
  p_crop TEXT,
  p_case_study_html TEXT,
  p_excerpt TEXT,
  p_source_html TEXT,
  p_cover_id TEXT,
  held_slug TEXT
);
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES entries(id),
  role TEXT NOT NULL CHECK (role IN ('photo','cover','image')),
  mime TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS featured (
  project_id TEXT PRIMARY KEY REFERENCES entries(id),
  position INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS published_media (
  photo_id TEXT NOT NULL REFERENCES photos(id),
  entry_id TEXT NOT NULL REFERENCES entries(id),
  PRIMARY KEY (photo_id, entry_id)
);
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ops (
  request_key TEXT PRIMARY KEY,
  op TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`);

export function now(): string {
	return new Date().toISOString();
}

export function newId(prefix: string): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
	return `${prefix}_${hex}`;
}

export function getKv(key: string): string | undefined {
	const row = db.prepare('SELECT value FROM kv WHERE key = ?').get(key) as
		| { value: string }
		| undefined;
	return row?.value;
}

export function setKv(key: string, value: string): void {
	db.prepare(
		'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
	).run(key, value);
}

export type EntryRow = {
	id: string;
	kind: 'project' | 'article';
	created_at: string;
	draft_version: number;
	draft_updated_at: string | null;
	d_title: string;
	d_slug: string;
	d_url: string;
	d_description: string;
	d_alt: string;
	d_photo_id: string | null;
	d_crop: string | null;
	d_case_study: string | null;
	d_excerpt: string;
	d_source: string | null;
	d_cover_id: string | null;
	pub_version: number | null;
	first_published_at: string | null;
	published_updated_at: string | null;
	p_title: string | null;
	p_slug: string | null;
	p_url: string | null;
	p_description: string | null;
	p_alt: string | null;
	p_photo_id: string | null;
	p_crop: string | null;
	p_case_study_html: string | null;
	p_excerpt: string | null;
	p_source_html: string | null;
	p_cover_id: string | null;
	held_slug: string | null;
};

export function getEntry(id: string): EntryRow | undefined {
	return db.prepare('SELECT * FROM entries WHERE id = ?').get(id) as EntryRow | undefined;
}

export function getEntryByPublicSlug(kind: string, slug: string): EntryRow | undefined {
	return db
		.prepare(
			"SELECT * FROM entries WHERE kind = ? AND p_slug = ? AND pub_version IS NOT NULL"
		)
		.get(kind, slug) as EntryRow | undefined;
}
