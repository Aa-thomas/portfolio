import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { db, newId, now } from './db';

/**
 * Owner authentication. Passwords use Node's built-in scrypt KDF (a standard,
 * memory-hard function) and sessions are 256-bit random tokens stored only as
 * a SHA-256 hash. There is no public registration: the single owner is
 * provisioned with `npm run owner:add` (D-03 recovery = re-run provisioning
 * with a new password).
 */

const SESSION_DAYS = 14;

export type Owner = { id: string; username: string };
export type Session = { owner: Owner; expiresAt: number };

export function hashPassword(password: string): string {
	const salt = randomBytes(16);
	const hash = scryptSync(password, salt, 64);
	return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
	const parts = stored.split('$');
	if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
	const salt = Buffer.from(parts[1], 'hex');
	const expected = Buffer.from(parts[2], 'hex');
	const actual = scryptSync(password, salt, expected.length);
	return timingSafeEqual(actual, expected);
}

export function countOwners(): number {
	const row = db.prepare('SELECT COUNT(*) AS n FROM owners').get() as { n: number };
	return row.n;
}

export function provisionOwner(username: string, password: string): void {
	if (!/^[a-z0-9_.-]{2,40}$/i.test(username)) {
		throw new Error('Username must be 2-40 letters, digits, dot, underscore or hyphen.');
	}
	if (password.length < 12) {
		throw new Error('Password must be at least 12 characters.');
	}
	db.prepare('DELETE FROM owners WHERE username = ?').run(username);
	db.prepare(
		'INSERT INTO owners (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)'
	).run(newId('own'), username, hashPassword(password), now());
}

function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export function createSession(ownerId: string): { token: string; expiresAt: number } {
	const token = randomBytes(32).toString('base64url');
	const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
	db.prepare(
		'INSERT INTO sessions (token_hash, owner_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
	).run(hashToken(token), ownerId, expiresAt, now());
	return { token, expiresAt };
}

export function readSession(token: string | undefined): Session | null {
	if (!token) return null;
	const row = db
		.prepare(
			`SELECT s.token_hash, s.expires_at, o.id AS owner_id, o.username
			 FROM sessions s JOIN owners o ON o.id = s.owner_id WHERE s.token_hash = ?`
		)
		.get(hashToken(token ?? '')) as
		| { token_hash: string; expires_at: number; owner_id: string; username: string }
		| undefined;
	if (!row) return null;
	if (row.expires_at <= Date.now()) {
		// An expired session can never authorize a pending save (SC-01).
		destroySession(token);
		return null;
	}
	return {
		owner: { id: row.owner_id, username: row.username },
		expiresAt: row.expires_at
	};
}

export function destroySession(token: string): void {
	db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

/** Find a login user, enforcing the same generic failure for both causes. */
export function authenticate(
	username: string,
	password: string
): Owner | null {
	const row = db
		.prepare('SELECT id, username, password_hash FROM owners WHERE username = ?')
		.get(username) as
		| { id: string; username: string; password_hash: string }
		| undefined;
	if (!row || !verifyPassword(password, row.password_hash)) return null;
	return { id: row.id, username: row.username };
}

/** Simple in-memory throttle: 5 failed logins per username+IP per 15 min. */
const attempts = new Map<string, { count: number; resetAt: number }>();

export function loginThrottled(key: string): boolean {
	const entry = attempts.get(key);
	return !!entry && entry.count >= 5 && entry.resetAt > Date.now();
}

export function recordFailedLogin(key: string): void {
	const entry = attempts.get(key);
	if (!entry || entry.resetAt <= Date.now()) {
		attempts.set(key, { count: 1, resetAt: Date.now() + 15 * 60 * 1000 });
	} else {
		entry.count += 1;
	}
}

export function clearFailedLogins(key: string): void {
	attempts.delete(key);
}
