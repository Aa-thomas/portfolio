#!/usr/bin/env node
// Provision or reset the single notebook owner (D-03 recovery path).
// Self-contained on purpose: plain Node cannot import the app's extensionless
// TS modules, and this must run before any server exists. The scrypt format
// mirrors src/lib/server/auth.ts exactly.
//
// Usage:
//   npm run owner:add -- <username> [password]     (password hidden if omitted)
//   OWNER_PASSWORD=... npm run owner:add -- <username>
import { scryptSync, randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';

const [username, ...rest] = process.argv.slice(2);
if (!username) {
	console.error('Usage: npm run owner:add -- <username> [password]');
	process.exit(1);
}
let password = rest[0] ?? process.env.OWNER_PASSWORD ?? '';
if (!password) {
	process.stdout.write('Password (12+ chars, hidden): ');
	password = await new Promise((resolvePw) => {
		process.stdin.setRawMode(true);
		process.stdin.setEncoding('utf8');
		let collected = '';
		const onData = (chunk) => {
			if (chunk === '\r' || chunk === '\n') {
				process.stdin.setRawMode(false);
				process.stdin.removeListener('data', onData);
				process.stdin.pause();
				resolvePw(collected);
			} else if (chunk === '\u0003') {
				process.exit(130);
			} else if (chunk === '\u007f') {
				collected = collected.slice(0, -1);
			} else {
				collected += chunk;
			}
		};
		process.stdin.on('data', onData);
	});
}

if (!/^[a-z0-9_.-]{2,40}$/i.test(username)) {
	console.error('Username must be 2-40 letters, digits, dot, underscore or hyphen.');
	process.exit(1);
}
if (password.trim().length < 12) {
	console.error('Password must be at least 12 characters.');
	process.exit(1);
}

const dataDir = resolve(process.env.PORTFOLIO_DATA ?? 'data');
const db = new DatabaseSync(resolve(dataDir, 'notebook.sqlite'));
db.exec(`CREATE TABLE IF NOT EXISTS owners (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);`);

const salt = randomBytes(16);
const hash = scryptSync(password.trim(), salt, 64);
const passwordHash = `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
db.prepare('DELETE FROM owners WHERE username = ?').run(username);
db.prepare(
	'INSERT INTO owners (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)'
).run(`own_${randomBytes(8).toString('hex')}`, username, passwordHash, new Date().toISOString());

const count = db.prepare('SELECT COUNT(*) AS n FROM owners').get().n;
db.close();
console.log(`Owner "${username}" is provisioned. ${count} owner account(s) exist.`);
