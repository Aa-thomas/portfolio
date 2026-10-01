import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { readSession } from '$lib/server/auth';
import { ensureDbFresh, flushDb } from '$lib/server/db';

const SESSION_COOKIE = 'notebook_session';

export const handle: Handle = async ({ event, resolve }) => {
	// On Netlify this re-pulls the database when another instance wrote; it is
	// a no-op on local filesystem storage.
	await ensureDbFresh();
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.owner = readSession(token);
	if (event.url.pathname.startsWith('/studio') && !event.locals.owner) {
		if (event.url.pathname !== '/studio/login') {
			// A UI redirect is never the only protection: loaders and actions
			// re-check the session server-side (SC-02); this is just UX.
			redirect(303, '/studio/login');
		}
	}
	const response = await resolve(event);
	// Write the mutated database back to durable storage before reporting
	// success to the owner (SC-24: no success banner before durable success).
	await flushDb();
	if (event.url.pathname.startsWith('/studio')) {
		// Private pages must never sit in a shared cache (INV-01).
		response.headers.set('Cache-Control', 'no-store');
	}
	return response;
};

export { SESSION_COOKIE };
