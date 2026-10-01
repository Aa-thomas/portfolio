import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { getStore, type GetStoreOptions } from '@netlify/blobs';
import { DATA_DIR } from './db';

/**
 * Durable bytes for uploaded media.
 *
 * Local (development/tests): the PORTFOLIO_DATA filesystem, same layout the
 * app always used — data/media/<id>/<file>.
 * Netlify (PORTFOLIO_STORAGE=blobs): Netlify Blobs, keyed media/<id>/<file>.
 * Netlify functions have no persistent disk, so blobs are the durable store
 * and the function acts as a private/published gate in front of them (PF-10).
 */
export const REMOTE_STORAGE = process.env.PORTFOLIO_STORAGE === 'blobs';

const DB_KEY = 'db/sqlite';

/**
 * The site's durable blob store (strong consistency; small personal site).
 * On Netlify the runtime injects a Blobs context for functions it detects
 * use the SDK. CLI-built deploys inline the SDK and defeat that detection,
 * so BLOBS_SITE_ID/BLOBS_TOKEN (set in the site environment) take over and
 * configure the store explicitly — the documented path for external use.
 */
export function store() {
	const siteID = process.env.BLOBS_SITE_ID;
	const token = process.env.BLOBS_TOKEN;
	const options: Omit<GetStoreOptions, 'name'> = { consistency: 'strong' };
	if (siteID && token) {
		options.siteID = siteID;
		options.token = token;
		options.apiURL = process.env.BLOBS_URL ?? 'https://api.netlify.com';
	}
	return getStore('notebook', options);
}

export async function putBytes(key: string, bytes: Buffer, metadata?: Record<string, string>) {
	if (!REMOTE_STORAGE) {
		const path = join(DATA_DIR, key);
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, bytes);
		if (metadata !== undefined) {
			writeFileSync(
				path + '.meta.json',
				JSON.stringify(metadata),
				'utf8'
			);
		}
		return;
	}
	const s = await store();
	await s.set(key, new Blob([new Uint8Array(bytes)]), { metadata });
}

export async function getBytes(key: string): Promise<Buffer | null> {
	if (!REMOTE_STORAGE) {
		try {
			return readFileSync(join(DATA_DIR, key));
		} catch {
			return null;
		}
	}
	const s = await store();
	const value = await s.get(key, { type: 'arrayBuffer' });
	return value ? Buffer.from(value) : null;
}

export async function getMetadata(key: string): Promise<Record<string, string> | null> {
	if (!REMOTE_STORAGE) {
		try {
			return JSON.parse(readFileSync(join(DATA_DIR, key + '.meta.json'), 'utf8'));
		} catch {
			return null;
		}
	}
	const s = await store();
	const entry = await s.getWithMetadata(key, { type: 'text' });
	return ((entry?.metadata ?? null) as Record<string, string> | null);
}

export const dbKey = DB_KEY;
