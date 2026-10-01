import { REMOTE_STORAGE } from './storage';

/**
 * Remote generation of the blob-stored database. The generation number lives
 * in a tiny standalone blob (`db/gen`) so freshness can be probed without
 * downloading the database itself. Used to detect writes from other function
 * instances.
 */
export async function getGeneration(): Promise<number | null> {
	if (!REMOTE_STORAGE) return null;
	const { getStore } = await import('@netlify/blobs');
	const store = getStore('notebook', { consistency: 'strong' });
	const value = await store.get('db/gen');
	return value ? Number(value) : null;
}
