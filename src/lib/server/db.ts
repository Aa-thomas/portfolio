import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomBytes, scryptSync } from 'node:crypto';
import { REMOTE_STORAGE, getBytes, putBytes, dbKey } from './storage';

/**
 * Durable content store. One SQLite database; two homes:
 *
 * - Local (development/tests): data/notebook.sqlite on disk, as always.
 * - Netlify (PORTFOLIO_STORAGE=blobs): functions have no persistent disk, so
 *   the database file lives in Netlify Blobs, stamped with a generation
 *   number. Each request checks the generation and re-pulls when someone else
 *   wrote; requests that mutated the database write it back after responding.
 *   A single owner edits this notebook, so writes never race in practice
 *   (last-write-wins is the documented fallback if two owner tabs hit two
 *   different instances at the same instant).
 */

export const DATA_DIR = resolve(process.env.PORTFOLIO_DATA ?? 'data');
export const MEDIA_DIR = join(DATA_DIR, 'media');

const SCHEMA = `
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
`;

export let db: DatabaseSync;
export let dbFile: string;

function openDb(file: string): DatabaseSync {
	const handle = new DatabaseSync(file);
	handle.exec('PRAGMA journal_mode=WAL;');
	handle.exec('PRAGMA foreign_keys=ON;');
	handle.exec(SCHEMA);
	return handle;
}

/**
 * Track mutations so the request hook can write the database back to blobs.
 * Statement `run` and `exec` calls are intercepted; schema application above
 * uses the raw handle so cold starts do not count as changes.
 */
function instrument(handle: DatabaseSync): DatabaseSync {
	return new Proxy(handle, {
		get(target, prop, receiver) {
			const value = Reflect.get(target, prop, target);
			if (prop === 'exec') {
				return (...args: Parameters<DatabaseSync['exec']>) => {
					const out = value.apply(target, args);
					dirty = true;
					return out;
				};
			}
			if (prop === 'prepare') {
				return (...args: Parameters<DatabaseSync['prepare']>) => {
					const statement = value.apply(target, args);
					return new Proxy(statement, {
						get(stmt, stmtProp, stmtReceiver) {
							const stmtValue = Reflect.get(stmt, stmtProp, stmt);
							if (stmtProp === 'run') {
								return (...runArgs: Parameters<typeof stmt.run>) => {
									const out = stmtValue.apply(stmt, runArgs);
									dirty = true;
									return out;
								};
							}
							return stmtValue;
						}
					}) as never;
				};
			}
			return value;
		}
	}) as DatabaseSync;
}

let localGen = 0;
let dirty = false;
let ready: Promise<void> | null = null;

async function pullFromBlobs(): Promise<void> {
	const bytes = await getBytes(dbKey);
	if (bytes) {
		writeFileSync(dbFile, bytes);
		db = instrument(openDb(dbFile));
	} else {
		// First boot ever: empty database, generation 0.
		db = instrument(openDb(dbFile));
	}
	// The standalone generation blob is authoritative for the bytes just read.
	const { getGeneration } = await import('./generation');
	const remote = await getGeneration();
	localGen = remote ?? 0;
	await bootstrapOwner();
}

/** Optional first-run owner provisioning on the host (D-03 recovery). */
async function bootstrapOwner(): Promise<void> {
	const username = process.env.OWNER_BOOTSTRAP_USERNAME;
	const password = process.env.OWNER_BOOTSTRAP_PASSWORD;
	if (!username || !password) return;
	const row = db.prepare('SELECT COUNT(*) AS n FROM owners').get() as { n: number };
	if (row.n === 0 || process.env.OWNER_BOOTSTRAP_FORCE === '1') {
		const salt = randomBytes(16);
		const hash = scryptSync(password, salt, 64);
		db.prepare('DELETE FROM owners WHERE username = ?').run(username);
		db.prepare(
			'INSERT INTO owners (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)'
		).run(
			`own_${randomBytes(8).toString('hex')}`,
			username,
			`scrypt$${salt.toString('hex')}$${hash.toString('hex')}`,
			new Date().toISOString()
		);
	}
}

if (!REMOTE_STORAGE) {
	mkdirSync(MEDIA_DIR, { recursive: true });
	dbFile = join(DATA_DIR, 'notebook.sqlite');
	db = openDb(dbFile);
} else {
	dbFile = join(tmpdir(), 'notebook.sqlite');
}

/** No-op locally; on Netlify, open (and first-pull) the database. */
export function ensureDbReady(): Promise<void> {
	if (!REMOTE_STORAGE) return Promise.resolve();
	ready ??= pullFromBlobs();
	return ready;
}

/** Re-pull when another instance wrote a newer generation. */
export async function ensureDbFresh(): Promise<void> {
	if (!REMOTE_STORAGE) return;
	await ensureDbReady();
	const { getGeneration } = await import('./generation');
	const remote = await getGeneration();
	if (remote !== null && remote > localGen) {
		ready = null;
		await ensureDbReady();
	}
}

/** Write the database back after a mutating request. */
export async function flushDb(): Promise<void> {
	if (!REMOTE_STORAGE || !dirty) return;
	const raw = new DatabaseSync(dbFile);
	raw.exec('PRAGMA wal_checkpoint(TRUNCATE);');
	raw.close();
	const bytes = readFileSync(dbFile);
	localGen += 1;
	// The generation is recorded inside the database too, so a restored
	// backup file always carries its own generation.
	const handle = new DatabaseSync(dbFile);
	handle.exec('PRAGMA journal_mode=WAL;');
	handle.prepare(
		"INSERT INTO kv (key, value) VALUES ('db_generation', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
	).run(String(localGen));
	handle.close();
	await putBytes(dbKey, readFileSync(dbFile), { gen: String(localGen) });
	await putBytes('db/gen', Buffer.from(String(localGen), 'utf8'));
	dirty = false;
}

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
		.prepare("SELECT * FROM entries WHERE kind = ? AND p_slug = ? AND pub_version IS NOT NULL")
		.get(kind, slug) as EntryRow | undefined;
}
