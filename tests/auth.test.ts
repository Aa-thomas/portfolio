import { beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

process.env.PORTFOLIO_DATA = mkdtempSync(join(tmpdir(), 'notebook-auth-'));

describe('owner authentication (PF-03)', () => {
	let auth: typeof import('../src/lib/server/auth');
	let db: typeof import('../src/lib/server/db');

	beforeAll(async () => {
		auth = await import('../src/lib/server/auth');
		db = await import('../src/lib/server/db');
		auth.provisionOwner('aaron', 'correct horse battery staple');
	});

	it('SC-01 signs in a provisioned owner', () => {
		const owner = auth.authenticate('aaron', 'correct horse battery staple');
		expect(owner?.username).toBe('aaron');
	});

	it('SC-01 rejects wrong names and passwords the same generic way', () => {
		expect(auth.authenticate('aaron', 'wrong password entirely')).toBeNull();
		expect(auth.authenticate('ghost', 'whatever password here')).toBeNull();
	});

	it('SC-01 sign-out ends the session server-side', () => {
		const id = db.newId('own');
		db.db
			.prepare('INSERT INTO owners (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)')
			.run(id, 'temp', 'scrypt$00$00', db.now());
		const session = auth.createSession(id);
		expect(auth.readSession(session.token)?.owner.username).toBe('temp');
		auth.destroySession(session.token);
		expect(auth.readSession(session.token)).toBeNull();
	});

	it('SC-02 an expired session authorizes nothing and is removed', () => {
		const id = db.newId('own');
		db.db
			.prepare('INSERT INTO owners (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)')
			.run(id, 'expired-user', 'scrypt$00$00', db.now());
		const token = 'expired-token-value';
		const tokenHash = createHash('sha256').update(token).digest('hex');
		db.db
			.prepare(
				'INSERT INTO sessions (token_hash, owner_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
			)
			.run(tokenHash, id, Date.now() - 1000, db.now());
		expect(auth.readSession(token)).toBeNull();
		const row = db.db.prepare('SELECT 1 FROM sessions WHERE token_hash = ?').get(tokenHash);
		expect(row).toBeUndefined();
	});

	it('passwords are stored as scrypt hashes, never plaintext', () => {
		const row = db.db
			.prepare('SELECT password_hash FROM owners WHERE username = ?')
			.get('aaron') as { password_hash: string };
		expect(row.password_hash.startsWith('scrypt$')).toBe(true);
		expect(row.password_hash).not.toContain('correct horse');
	});
});
