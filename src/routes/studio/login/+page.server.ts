import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import {
		authenticate,
		clearFailedLogins,
		createSession,
		loginThrottled,
		recordFailedLogin
	} from '$lib/server/auth';
import { SESSION_COOKIE } from '../../../hooks.server';

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const throttleKey = `${getClientAddress()}:${username.toLowerCase()}`;
		if (loginThrottled(throttleKey)) {
			return fail(429, {
				message: 'Too many attempts. Wait a few minutes and try again.'
			});
		}
		const owner = authenticate(username, password);
		if (!owner) {
			// Same generic failure whether the name or the password was wrong (SC-01).
			recordFailedLogin(throttleKey);
			return fail(401, { message: 'That sign-in did not work. Check it and try again.' });
		}
		clearFailedLogins(throttleKey);
		const session = createSession(owner.id);
		cookies.set(SESSION_COOKIE, session.token, {
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			path: '/',
			expires: new Date(session.expiresAt)
		});
		redirect(303, '/studio');
	}
};
