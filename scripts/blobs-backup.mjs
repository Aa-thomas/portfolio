// Binary-safe backup/restore of the notebook's Netlify Blobs store (PF-10).
//
// The Netlify CLI's blobs:get/set flags are text-oriented and mangle binary
// data (invalid UTF-8 becomes replacement characters), which corrupts the
// SQLite database. This script uses the @netlify/blobs SDK directly — the
// same client the app uses — so bytes round-trip unchanged.
//
//   NETLIFY_SITE_ID=<id> NETLIFY_AUTH_TOKEN=<token> \
//     node scripts/blobs-backup.mjs backup  <out-dir>
//   NETLIFY_SITE_ID=<id> NETLIFY_AUTH_TOKEN=<token> \
//     node scripts/blobs-backup.mjs restore <in-dir>
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getStore } from '@netlify/blobs';

const SITE_ID = process.env.NETLIFY_SITE_ID;
const TOKEN = process.env.NETLIFY_AUTH_TOKEN;
const [mode, dir] = process.argv.slice(2);

if (!SITE_ID || !TOKEN || !mode || !dir || !['backup', 'restore'].includes(mode)) {
	console.error(
		'Usage: NETLIFY_SITE_ID=<id> NETLIFY_AUTH_TOKEN=<token> node scripts/blobs-backup.mjs backup|restore <dir>'
	);
	process.exit(1);
}

const store = getStore('notebook', {
	siteID: SITE_ID,
	token: TOKEN,
	apiURL: 'https://api.netlify.com',
	consistency: 'strong'
});

const filename = (key) => key.replace(/\//g, '_');
const keyOf = (name) => name.replace(/(^|_)db_gen($|_)/, 'db_gen').replace(/_/g, '/');

if (mode === 'backup') {
	const { blobs } = await store.list();
	mkdirSync(dir, { recursive: true });
	const manifest = [];
	for (const blob of blobs) {
		const bytes = await store.get(blob.key, { type: 'arrayBuffer' });
		if (bytes === null) continue;
		const path = join(dir, filename(blob.key));
		writeFileSync(path, Buffer.from(bytes));
		manifest.push(blob.key);
	}
	writeFileSync(join(dir, 'manifest.txt'), manifest.join('\n') + '\n', 'utf8');
	console.log(`Backed up ${manifest.length} objects to ${dir}`);
} else {
	const manifestPath = join(dir, 'manifest.txt');
	if (!existsSync(manifestPath)) {
		console.error('No manifest.txt in that directory.');
		process.exit(1);
	}
	const keys = readFileSync(manifestPath, 'utf8').split('\n').filter(Boolean);
	for (const key of keys) {
		const bytes = readFileSync(join(dir, filename(key)));
		await store.set(key, new Uint8Array(bytes));
	}
	console.log(`Restored ${keys.length} objects from ${dir}`);
}
