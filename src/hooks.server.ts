import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { readSession } from '$lib/server/auth';

const SESSION_COOKIE = 'notebook_session';

export const handle: Handle = async ({ event, resolve }) => {
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
	if (event.url.pathname.startsWith('/studio')) {
		// Private pages must never sit in a shared cache (INV-01).
		response.headers.set('Cache-Control', 'no-store');
	}
	return response;
};

export { SESSION_COOKIE };
